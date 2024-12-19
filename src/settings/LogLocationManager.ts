import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

/**
 * Description placeholder
 *
 * @interface LogDirectory
 * @typedef {LogDirectory}
 * 
 * @property {string} originalPath
 * @property {string} resolvedPath
 * @property {boolean} isValid
 * @property {string} [error]
 * @property {vscode.FileSystemWatcher} [watcher]
 */
interface LogDirectory {

    originalPath: string;
    resolvedPath: string;
    isValid: boolean;
    error?: string;
    watcher?: vscode.FileSystemWatcher;
}

/**
 * Description placeholder
 *
 * @interface PathValidationResult
 * @typedef {PathValidationResult}
 * 
 * @property {boolean} isValid
 * @property {?string} [resolvedPath]
 * @property {?string} [error]
 */
interface PathValidationResult {
    isValid: boolean;
    resolvedPath?: string;
    error?: string;
}

/**
 * Description placeholder
 *
 * 
 * @class LogLocationManager
 * @typedef {LogLocationManager}
 * @extends {EventEmitter}
 * 
 * @property {Map<string, LogDirectory>} directories
 * @property {vscode.Disposable[]} disposables
 * 
 *  constructor: Initializes the manager with a VS Code extension context and sets up event listeners for configuration changes.
 *  initialize: Loads the initial configuration, sets up periodic validation, and watches for configuration changes.
 *  loadConfiguration: Loads the current configuration from the VS Code workspace settings and updates the manager's directories.
 *  addDirectory: Adds a new directory to the manager's directories and creates a file system watcher for it.
 *  validatePath: Validates a directory path by resolving workspace variables, environment variables, and relative paths, and checking if the path exists and is accessible.
 *  createWatcher: Creates a file system watcher for a directory and sets up event listeners for file creation, change, and deletion.
 *  validateAllPaths: Validates all directory paths in the manager's directories and updates their status.
 *  notifyError: Notifies the user of an error with a log directory and updates the directory's status.
 *  getValidDirectories: Returns an array of valid directory paths.
 *  updateConfiguration: Updates the configuration with a new set of directory paths.
 *  getLocations: Returns an array of log locations from the VS Code workspace settings.
 *  getValidLocations: Returns an array of valid log locations.
 *  init: Initializes the manager by calling the initialize method.
 *  dispose: Disposes of the manager's resources, including file system watchers and directories
 */
export class LogLocationManager extends EventEmitter {

    private static readonly CONFIG_SECTION = 'browsechat.logs';
    private static readonly CONFIG_DIRECTORIES = 'directories';

    private directories: Map<string, LogDirectory> = new Map();
    private disposables: vscode.Disposable[] = [];

    /**
     * Creates an instance of LogLocationManager.
     *
     * 
     * @param {vscode.ExtensionContext} context
     */
    constructor(private readonly context: vscode.ExtensionContext) {
        super();
        this.initialize();
    }

    /**
     * Initializes the manager
     *
     * @private
     * 
     * @returns {*}
     */
    private async initialize() {
        // Load initial configuration
        await this.loadConfiguration();

        // Watch for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(LogLocationManager.CONFIG_SECTION)) {
                    this.loadConfiguration();
                }
            })
        );

        // Setup periodic validation
        setInterval(() => this.validateAllPaths(), 5 * 60 * 1000); // Every 5 minutes
    }

    /**
     * Description placeholder
     *
     * @private
     * 
     * @returns {*}
     */
    private async loadConfiguration() {
        const config = vscode.workspace.getConfiguration(LogLocationManager.CONFIG_SECTION);
        const configuredPaths = config.get<string[]>(LogLocationManager.CONFIG_DIRECTORIES, []);

        // Clear existing watchers
        for (const dir of this.directories.values()) {
            dir.watcher?.dispose();
        }
        this.directories.clear();

        // Process each configured path
        for (const path of configuredPaths) {
            await this.addDirectory(path);
        }
    }

    /**
     * Description placeholder
     *
     * @public
     * 
     * @param {string} dirPath
     * @returns {Promise<boolean>}
     */
    public async addDirectory(dirPath: string): Promise<boolean> {
        try {
            const validation = await this.validatePath(dirPath);
            if (!validation.isValid || !validation.resolvedPath) {
                this.notifyError(dirPath, validation.error || 'Invalid path');
                return false;
            }

            const watcher = this.createWatcher(validation.resolvedPath);
            this.directories.set(dirPath, {
                originalPath: dirPath,
                resolvedPath: validation.resolvedPath,
                isValid: true,
                watcher
            });

            this.emit('directoryAdded', validation.resolvedPath);
            return true;

        } catch (error) {
            this.notifyError(dirPath, error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * Description placeholder
     *
     * @private
     * 
     * @param {string} dirPath
     * @returns {Promise<PathValidationResult>}
     */
    private async validatePath(dirPath: string): Promise<PathValidationResult> {
        try {
            // Resolve workspace variables
            let resolvedPath = dirPath;
            if (resolvedPath.includes('${workspaceFolder}')) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    return {
                        isValid: false,
                        error: 'No workspace folder open'
                    };
                }
                resolvedPath = resolvedPath.replace(
                    /\${workspaceFolder}/g,
                    workspaceFolders[0].uri.fsPath
                );
            }

            // Resolve environment variables
            resolvedPath = resolvedPath.replace(/%([^%]+)%/g, (_, variable) => {
                const value = process.env[variable];
                if (!value) {
                    throw new Error(`Environment variable ${variable} not found`);
                }
                return value;
            });

            // Resolve relative paths
            if (!path.isAbsolute(resolvedPath)) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders) {
                    return {
                        isValid: false,
                        error: 'Cannot resolve relative path without workspace'
                    };
                }
                resolvedPath = path.resolve(workspaceFolders[0].uri.fsPath, resolvedPath);
            }

            // Check if path exists and is accessible
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory()) {
                return {
                    isValid: false,
                    error: 'Path is not a directory'
                };
            }

            // Check if we have read permission
            await fs.access(resolvedPath, fs.constants.R_OK);

            return {
                isValid: true,
                resolvedPath
            };

        } catch (error) {
            if (error instanceof Error) {
                const nodeError = error as NodeJS.ErrnoException;
                if (nodeError.code === 'ENOENT') {
                    return {
                        isValid: false,
                        error: 'Directory does not exist'
                    };
                }
                if (nodeError.code === 'EACCES') {
                    return {
                        isValid: false,
                        error: 'Permission denied'
                    };
                }
                return {
                    isValid: false,
                    error: error.message
                };
            }
            return {
                isValid: false,
                error: String(error)
            };
        }
    }

    /**
     * Description placeholder
     *
     * @private
     * @param {string} dirPath
     * @returns {vscode.FileSystemWatcher}
     */
    private createWatcher(dirPath: string): vscode.FileSystemWatcher {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(dirPath, '**/*.log')
        );

        watcher.onDidCreate(uri => {
            this.emit('fileCreated', uri.fsPath);
        });

        watcher.onDidChange(uri => {
            this.emit('fileChanged', uri.fsPath);
        });

        watcher.onDidDelete(uri => {
            this.emit('fileDeleted', uri.fsPath);
        });

        this.disposables.push(watcher);
        return watcher;
    }

    /**
     * Description placeholder
     *
     * @private
     * 
     * @returns {*}
     */
    private async validateAllPaths() {
        for (const [dirPath, directory] of this.directories.entries()) {
            const validation = await this.validatePath(dirPath);
            
            // Path status changed
            if (validation.isValid !== directory.isValid) {
                if (validation.isValid && validation.resolvedPath) {
                    // Path became valid
                    directory.isValid = true;
                    directory.error = undefined;
                    directory.resolvedPath = validation.resolvedPath;
                    directory.watcher = this.createWatcher(validation.resolvedPath);
                    this.emit('directoryRestored', validation.resolvedPath);
                } else {
                    // Path became invalid
                    directory.isValid = false;
                    directory.error = validation.error;
                    directory.watcher?.dispose();
                    directory.watcher = undefined;
                    this.emit('directoryLost', dirPath, validation.error);
                }
            }
        }
    }

    /**
     * Description placeholder
     *
     * @private
     * @param {string} dirPath
     * @param {string} error
     */
    private notifyError(dirPath: string, error: string) {
        this.directories.set(dirPath, {
            originalPath: dirPath,
            resolvedPath: dirPath,
            isValid: false,
            error
        });
        this.emit('error', dirPath, error);
        vscode.window.showErrorMessage(
            `Error with log directory "${dirPath}": ${error}`
        );
    }

    /**
     * Description placeholder
     *
     * @public
     * @returns {string[]}
     */
    public getValidDirectories(): string[] {
        return Array.from(this.directories.values())
            .filter(dir => dir.isValid)
            .map(dir => dir.resolvedPath);
    }

    /**
     * Description placeholder
     *
     * @public
     * 
     * @param {string[]} paths
     * @returns {*}
     */
    public async updateConfiguration(paths: string[]) {
        const config = vscode.workspace.getConfiguration(LogLocationManager.CONFIG_SECTION);
        await config.update(LogLocationManager.CONFIG_DIRECTORIES, paths, true);
    }

    /**
     * Description placeholder
     *
     * @public
     * 
     * @returns {Promise<string[]>}
     */
    public async getLocations(): Promise<string[]> {
        const config = vscode.workspace.getConfiguration('browsechat');
        const locations = config.get<string[]>('logs.locations') || [];
        return locations;
    }

    /**
     * Description placeholder
     *
     * @public
     * 
     * @returns {Promise<string[]>}
     */
    public async getValidLocations(): Promise<string[]> {
        const locations = await this.getLocations();
        return locations.filter(location => {
            try {
                return path.isAbsolute(location);
            } catch {
                return false;
            }
        });
    }

    /**
     * Description placeholder
     *
     * @public
     * 
     * @returns {Promise<void>}
     */
    public async init(): Promise<void> {
        await this.initialize();
    }

    /**
     * Description placeholder
     *
     * @public
     */
    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.directories.forEach(dir => dir.watcher?.dispose());
        this.directories.clear();
    }
}
