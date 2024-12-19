import * as vscode from 'vscode';
import * as path from 'path';
import { Minimatch } from 'minimatch';
import { EventEmitter } from 'events';


/**
 * Detection mode for workspace detection.
 *
 * 
 * @enum {number}
 * 
 * @property {string} Manual - Manual detection mode.
 * @property {string} Auto - Automatic detection mode.
 */
export enum DetectionMode {
    Manual = 'manual',
    Auto = 'auto'
}


/**
 * Detection configuration.
 *
 * @interface DetectionConfig
 * @typedef {DetectionConfig}
 * 
 * @property {DetectionMode} mode - Detection mode.
 * @property {number} maxDepth - Maximum depth to search for log files.
 * @property {string[]} exclusions - Glob patterns to exclude from search.
 */
interface DetectionConfig {

    mode: DetectionMode;
    maxDepth: number;
    exclusions: string[];
}


/**
 * Search progress information.
 *
 * @interface SearchProgress
 * @typedef {SearchProgress}
 * 
 * @property {number} processed - Number of files processed.
 * @property {number} total - Total number of files to process.
 * @property {string[]} skipped - List of directories skipped during search.
 */
export interface SearchProgress {
    processed: number;
    total: number;
    skipped: string[];
}


/**
 * Workspace detection manager.
 *
 * 
 * @class WorkspaceDetectionManager
 * @extends {EventEmitter}
 * 
 * @property {DetectionConfig} config - Current detection configuration.
 * @property {vscode.FileSystemWatcher[]} fileWatchers - List of file system watchers.
 * @property {vscode.Disposable[]} disposables - List of disposables for cleanup.
 * @property {boolean} searchInProgress - Flag indicating if a search is in progress.
 * 
 *  Constructor: Initializes the manager with a default configuration and sets up event listeners for configuration changes.
 *  initialize: Loads the current configuration and initializes the manager based on the current mode.
 *  loadConfiguration: Loads the current configuration from the VS Code workspace settings and updates the manager's configuration.
 *  updateDetectionMode: Updates the detection mode and clears existing file watchers.
 *  startAutoDetection: Starts automatic detection of log files in the workspace.
 *  detectInWorkspace: Recursively searches for log files in a workspace directory.
 *  isExcluded: Checks if a file path is excluded from search based on the configuration.
 *  setupFileWatcher: Sets up a file system watcher for a directory.
 *  setDetectionMode: Updates the detection mode in the VS Code workspace settings.
 *  setMaxDepth: Updates the search depth in the VS Code workspace settings.
 *  updateExclusions: Updates the exclusion patterns in the VS Code workspace settings.
 *  getCurrentMode: Returns the current detection mode.
 *  getMaxDepth: Returns the current search depth.
 *  getExclusions: Returns the current exclusion patterns.
 *  isSearching: Returns whether a search is in progress.
 *  dispose: Disposes of the manager's resources.
 *  detectWorkspaces: Detects log files in all workspace folders.
 *  getCurrentWorkspace: Returns the current workspace folder.
 *  detect: Detects log files in the workspace (alias for detectWorkspaces).
 *  getCurrent: Returns the current workspace folder (alias for getCurrentWorkspace).
 */
export class WorkspaceDetectionManager extends EventEmitter {
   
    private static readonly CONFIG_SECTION = 'browsechat.detection';
    private static readonly DEFAULT_CONFIG: DetectionConfig = {
        mode: DetectionMode.Manual,
        maxDepth: 3,
        exclusions: ['**/node_modules/**', '**/bin/**', '**/obj/**']
    };

    private config: DetectionConfig;
    private disposables: vscode.Disposable[] = [];
    private fileWatchers: vscode.FileSystemWatcher[] = []; // Add this line
    private searchInProgress: boolean = false;

    
    /**
     * Creates an instance of WorkspaceDetectionManager.
     *
     * 
     * @param {vscode.ExtensionContext} context
     */
    constructor(private readonly context: vscode.ExtensionContext) {
        super();
        this.config = { ...WorkspaceDetectionManager.DEFAULT_CONFIG };
        this.initialize();
    }

    
    /**
     * Initialize the manager with a default configuration and set up event listeners for configuration changes.
     *
     * @private
     * 
     * @returns {*}
     */
    private async initialize() {
        await this.loadConfiguration();
        
        // Watch for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(WorkspaceDetectionManager.CONFIG_SECTION)) {
                    this.loadConfiguration();
                }
            })
        );

        // Initialize based on current mode
        await this.updateDetectionMode();
    }

    
    /**
     * Load the current configuration and initialize the manager based on the current mode.
     *
     * @private
     * 
     * @returns {*}
     */
    private async loadConfiguration() {
        const config = vscode.workspace.getConfiguration(WorkspaceDetectionManager.CONFIG_SECTION);
        
        this.config = {
            mode: config.get<DetectionMode>('mode', WorkspaceDetectionManager.DEFAULT_CONFIG.mode),
            maxDepth: Math.max(0, config.get<number>('maxDepth', WorkspaceDetectionManager.DEFAULT_CONFIG.maxDepth)),
            exclusions: config.get<string[]>('exclusions', WorkspaceDetectionManager.DEFAULT_CONFIG.exclusions)
        };

        // Merge with VS Code's exclude patterns
        const filesConfig = vscode.workspace.getConfiguration('files');
        const vsCodeExcludes = filesConfig.get<{ [key: string]: boolean }>('exclude', {});
        this.config.exclusions.push(
            ...Object.entries(vsCodeExcludes)
                .filter(([_, excluded]) => excluded)
                .map(([pattern]) => pattern)
        );

        await this.updateDetectionMode();
    }

    /**
     * Update the detection mode and clear existing file watchers.
     *
     * @private
     * 
     * @returns {*}
     */
    private async updateDetectionMode() {
        // Clear existing watchers
        this.disposeFileWatchers();

        if (this.config.mode === DetectionMode.Auto) {
            await this.startAutoDetection();
        }

        this.emit('modeChanged', this.config.mode);
    }

    /**
     * Start automatic detection of log files in the workspace.
     *
     * @private
     * 
     * @returns {*}
     */
    private async startAutoDetection() {
        if (!vscode.workspace.workspaceFolders || this.searchInProgress) {
            return;
        }

        this.searchInProgress = true;
        const progress: SearchProgress = {
            processed: 0,
            total: 0,
            skipped: [] as string[]
        };

        try {
            for (const folder of vscode.workspace.workspaceFolders) {
                await this.detectInWorkspace(folder.uri.fsPath, 0, progress);
            }
        } finally {
            this.searchInProgress = false;
        }

        this.emit('searchComplete', progress);
    }

    /**
     * Detect log files in a workspace directory.
     *
     * @private
     * 
     * @param {string} dir
     * @param {number} depth
     * @param {SearchProgress} progress
     * @returns {Promise<void>}
     */
    private async detectInWorkspace(
        dir: string,
        depth: number,
        progress: SearchProgress
    ): Promise<void> {
        if (depth > this.config.maxDepth) {
            progress.skipped.push(dir);
            return;
        }

        if (this.isExcluded(dir)) {
            progress.skipped.push(dir);
            return;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
            progress.total += entries.length;

            for (const [name, type] of entries) {
                const fullPath = path.join(dir, name);

                if (type === vscode.FileType.Directory) {
                    await this.detectInWorkspace(fullPath, depth + 1, progress);
                } else if (type === vscode.FileType.File) {
                    this.setupFileWatcher(dir);
                }

                progress.processed++;
                this.emit('searchProgress', progress);
            }
        } catch (error) {
            progress.skipped.push(dir);
            this.emit('error', `Failed to process directory: ${dir}`, error);
        }
    }

    /**
     * Is a file path excluded from search?
     *
     * @private
     * @param {string} filePath
     * @returns {boolean}
     */
    private isExcluded(filePath: string): boolean {
        return this.config.exclusions.some(pattern => {
            const minimatch = new Minimatch(pattern);
            return minimatch.match(filePath);
        });
    }

    /**
     * Set up a file system watcher for a directory.
     *
     * @private
     * @param {string} dir
     */
    private setupFileWatcher(dir: string): void {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(dir, '**/*.{log,txt}')
        );
        watcher.onDidCreate(uri => this.emit('fileFound', uri.fsPath));
        watcher.onDidDelete(uri => this.emit('fileRemoved', uri.fsPath));
        watcher.onDidChange(uri => this.emit('fileChanged', uri.fsPath));
        this.fileWatchers.push(watcher);
    }

    /**
     * Set the detection mode.
     *
     * @public
     * 
     * @param {DetectionMode} mode
     * @returns {*}
     */
    public async setDetectionMode(mode: DetectionMode) {
        const config = vscode.workspace.getConfiguration(WorkspaceDetectionManager.CONFIG_SECTION);
        await config.update('mode', mode, true);
    }

    /**
     * Set the maximum search depth.
     *
     * @public
     * 
     * @param {number} depth
     * @returns {*}
     */
    public async setMaxDepth(depth: number) {
        if (depth < 0) {
            throw new Error('Search depth cannot be negative');
        }
        const config = vscode.workspace.getConfiguration(WorkspaceDetectionManager.CONFIG_SECTION);
        await config.update('maxDepth', depth, true);
    }

    /**
     * Update the exclusion patterns.
     *
     * @public
     * 
     * @param {string[]} exclusions
     * @returns {*}
     */
    public async updateExclusions(exclusions: string[]) {
        const config = vscode.workspace.getConfiguration(WorkspaceDetectionManager.CONFIG_SECTION);
        await config.update('exclusions', exclusions, true);
    }

    /**
     * Get the current detection mode.
     *
     * @public
     * @returns {DetectionMode}
     */
    public getCurrentMode(): DetectionMode {
        return this.config.mode;
    }

    /**
     * Get the current max search depth.
     *
     * @public
     * @returns {number}
     */
    public getMaxDepth(): number {
        return this.config.maxDepth;
    }

    /**
     * Get the current exclusion patterns.
     *
     * @public
     * @returns {string[]}
     */
    public getExclusions(): string[] {
        return [...this.config.exclusions];
    }

    /**
     * Is a search in progress?
     *
     * @public
     * @returns {boolean}
     */
    public isSearching(): boolean {
        return this.searchInProgress;
    }

    /**
     * Dispose of all file system watchers.
     *
     * @private
     */
    private disposeFileWatchers(): void {
        this.fileWatchers.forEach((watcher: vscode.FileSystemWatcher) => watcher.dispose());
        this.fileWatchers = [];
    }

    /**
     * Dispose of the manager's resources.
     *
     * @public
     * @returns {void}
     */
    public dispose(): void {
        this.disposeFileWatchers();
        this.disposables.forEach(d => d.dispose());
    }

    /**
     * Detect log files in all workspace folders.
     *
     * @public
     * 
     * @returns {Promise<void>}
     */
    public async detectWorkspaces(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            await this.detectInWorkspace(folder.uri.fsPath, 0, { processed: 0, total: 0, skipped: [] as string[] });
        }
    }

    /**
     * Get the current workspace folder.
     *
     * @public
     * 
     * @returns {Promise<vscode.WorkspaceFolder | undefined>}
     */
    public async getCurrentWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
        if (!vscode.workspace.workspaceFolders) {
            return undefined;
        }

        return vscode.workspace.workspaceFolders[0];
    }

    /**
     * Detect log files in the workspace.
     *
     * @public
     * 
     * @returns {Promise<void>}
     */
    public async detect(): Promise<void> {
        await this.detectWorkspaces();
    }

    /**
     * Get the current workspace folder.
     *
     * @public
     * 
     * @returns {Promise<vscode.WorkspaceFolder | undefined>}
     */
    public async getCurrent(): Promise<vscode.WorkspaceFolder | undefined> {
        return this.getCurrentWorkspace();
    }
}
