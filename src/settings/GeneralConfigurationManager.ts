import * as vscode from 'vscode';
import { EventEmitter } from 'events';


/**
 * Theme mode for the chat browser UI
 *
 * 
 * @enum {number}
 * 
 * @property {string} Auto - Automatically switch between light and dark themes based on the system settings.
 * @property {string} Light - Always use the light theme.
 * @property {string} Dark - Always use the dark theme.
 */
export enum ThemeMode {
    Auto = 'auto',
    Light = 'light',
    Dark = 'dark'
}

/**
 * Cache configuration for the chat browser
 *
 * @interface CacheConfig
 * @typedef {CacheConfig}
 * 
 * @property {boolean} enabled - Whether caching is enabled.
 * @property {number} maxSize - The maximum cache size in bytes.
 * @property {boolean} clearOnExit - Whether to clear the cache when VS Code exits.
 */
export interface CacheConfig {
    enabled: boolean;
    maxSize: number;
    clearOnExit: boolean;
}

/**
 * General configuration for the chat browser
 *
 * @interface GeneralConfig
 * @typedef {GeneralConfig}
 * 
 * @property {number} maxFileSize - The maximum file size in bytes.
 * @property {boolean} autoOpen - Whether to automatically open the chat browser when a log file is selected.
 * @property {ThemeMode} theme - The UI theme mode.
 * @property {CacheConfig} caching - The cache configuration.
 */
interface GeneralConfig {
    maxFileSize: number;
    autoOpen: boolean;
    theme: ThemeMode;
    caching: CacheConfig;
}


/**
 * Validation result for a configuration setting
 *
 * 
 * @interface ValidationResult
 * @typedef {ValidationResult}
 * 
 * @property {boolean} isValid - Whether the configuration setting is valid.
 * @property {string} [message] - The error message if the setting is invalid.
 * @property {any} [suggestion] - The suggested value for the setting.
 */
export interface ValidationResult {
    isValid: boolean;
    message?: string;
    suggestion?: any;
}


/**
 * Chat browser configuration manager
 *
 * 
 * @class GeneralConfigurationManager
 * @extends {EventEmitter}
 * @typedef {GeneralConfigurationManager}
 * @module GeneralConfigurationManager
 * 
 * @property {GeneralConfig} config - The current configuration settings.
 * @property {number} cacheSize - The current cache size in bytes.
 * @property {vscode.Disposable[]} disposables - An array of disposables for event listeners.
 * 
 *  init(): Initializes the configuration manager by loading the current configuration and setting up event listeners for configuration changes.
 *  initialize(): Loads the current configuration from the VS Code workspace settings and initializes the cache size from storage.
 *  loadConfiguration(): Loads the current configuration from the VS Code workspace settings and validates the new configuration. If the configuration is invalid, it displays error messages and does not update the configuration.
 *  validateConfiguration(): Validates a given configuration object and returns an array of validation results. It checks for valid values for maxFileSize, theme, and caching settings.
 *  setMaxFileSize(): Updates the maxFileSize setting in the VS Code workspace settings.
 *  setAutoOpen(): Updates the autoOpen setting in the VS Code workspace settings.
 *  setTheme(): Updates the theme setting in the VS Code workspace settings.
 *  updateCacheConfig(): Updates the caching settings in the VS Code workspace settings.
 *  shouldAutoOpen(): Returns the current value of the autoOpen setting.
 *  getCurrentTheme(): Returns the current value of the theme setting.
 *  getMaxFileSize(): Returns the current value of the maxFileSize setting.
 *  getCacheConfig(): Returns the current value of the caching settings.
 *  getCurrentCacheSize(): Returns the current cache size.
 *  addToCache(): Adds a given size to the cache and updates the cache size in storage. If the cache is full, it emits a cacheFull event and returns false.
 *  clearCache(): Clears the cache and updates the cache size in storage. It also emits a cacheCleared event.
 *  getSettingDocumentation(): Returns a dictionary of setting documentation for each configuration setting.
 *  dispose(): Disposes of the configuration manager by clearing the cache if clearOnExit is enabled and disposing of all event listeners.
 */
export class GeneralConfigurationManager extends EventEmitter {
    private static readonly CONFIG_SECTION = 'browsechat.general';
    private static readonly DEFAULT_CONFIG: GeneralConfig = {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        autoOpen: true,
        theme: ThemeMode.Auto,
        caching: {
            enabled: true,
            maxSize: 100 * 1024 * 1024, // 100MB
            clearOnExit: true
        }
    };

    private config: GeneralConfig;
    private cacheSize: number = 0;
    private disposables: vscode.Disposable[] = [];

    /**
     * Constructor for the GeneralConfigurationManager class.
     * @param context - The VS Code extension context.
     */
    constructor(private readonly context: vscode.ExtensionContext) {
        super();
        this.config = { ...GeneralConfigurationManager.DEFAULT_CONFIG };
    }

    /**
     * Initializes the configuration manager by loading the current configuration and setting up event listeners for configuration changes.
     * @public
     * 
     * @returns {Promise<void>} A promise that resolves when the initialization is complete.
     */
    public async init(): Promise<void> {
        await this.initialize();
    }

    /**
     * Loads the current configuration from the VS Code workspace settings and initializes the cache size from storage.
     * @private
     * 
     */
    private async initialize() {
        await this.loadConfiguration();
        
        // Watch for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(GeneralConfigurationManager.CONFIG_SECTION)) {
                    this.loadConfiguration();
                }
            })
        );

        // Initialize cache from storage
        this.cacheSize = this.context.globalState.get<number>('cacheSize', 0);
    }

    /**
     * Loads the current configuration from the VS Code workspace settings and validates the new configuration. If the configuration is invalid, it displays error messages and does not update the configuration.
     * @private
     * 
     * @returns {Promise<void>} A promise that resolves when the configuration is loaded and validated. 
     * # ADDED RETURN TYPE VOID OR PROMISE<void>
     * # TODO UPDATE TESTS
     */
    private async loadConfiguration() {
        const config = vscode.workspace.getConfiguration(GeneralConfigurationManager.CONFIG_SECTION);
        
        const newConfig = {
            maxFileSize: config.get<number>('maxFileSize', this.config.maxFileSize),
            autoOpen: config.get<boolean>('autoOpen', this.config.autoOpen),
            theme: config.get<ThemeMode>('theme', this.config.theme),
            caching: {
                enabled: config.get<boolean>('caching.enabled', this.config.caching.enabled),
                maxSize: config.get<number>('caching.maxSize', this.config.caching.maxSize),
                clearOnExit: config.get<boolean>('caching.clearOnExit', this.config.caching.clearOnExit)
            }
        };

        // Validate new configuration
        const validationResults = this.validateConfiguration(newConfig);
        if (!validationResults.every(r => r.isValid)) {
            const errors = validationResults.filter(r => !r.isValid);
            errors.forEach(error => {
                this.emit('validationError', error);
                vscode.window.showErrorMessage(
                    `Configuration error: ${error.message}` +
                    (error.suggestion ? `. Suggestion: ${error.suggestion}` : '')
                );
            });
            return;
        }

        const oldConfig = this.config;
        this.config = newConfig;

        // Emit change events
        if (oldConfig.theme !== this.config.theme) {
            this.emit('themeChanged', this.config.theme);
        }
        if (oldConfig.caching.enabled !== this.config.caching.enabled) {
            this.emit('cachingChanged', this.config.caching.enabled);
        }
    }

    /**
     * Validates a given configuration object and returns an array of validation results. It checks for valid values for maxFileSize, theme, and caching settings.  
     * @private
     * @param {GeneralConfig} config - The configuration object to validate.
     * @returns {ValidationResult[]} An array of validation results.
     * */
    private validateConfiguration(config: GeneralConfig): ValidationResult[] {
        const results: ValidationResult[] = [];

        // Validate maxFileSize
        if (config.maxFileSize <= 0) {
            results.push({
                isValid: false,
                message: 'Maximum file size must be positive',
                suggestion: GeneralConfigurationManager.DEFAULT_CONFIG.maxFileSize
            });
        }

        // Validate theme
        if (!Object.values(ThemeMode).includes(config.theme)) {
            results.push({
                isValid: false,
                message: `Invalid theme mode: ${config.theme}`,
                suggestion: Object.values(ThemeMode).join(', ')
            });
        }

        // Validate cache size
        if (config.caching.enabled && config.caching.maxSize <= 0) {
            results.push({
                isValid: false,
                message: 'Cache size must be positive when caching is enabled',
                suggestion: GeneralConfigurationManager.DEFAULT_CONFIG.caching.maxSize
            });
        }

        return results;
    }

    
    /**
     * Sets the maximum file size for file caching.
     *
     * @public
     * 
     * @param {number} size - The maximum file size in bytes.
     * @returns {Promise<void>}
     */
    public async setMaxFileSize(size: number): Promise<void> {
        if (size <= 0) {
            throw new Error('Maximum file size must be positive');
        }
        const config = vscode.workspace.getConfiguration(GeneralConfigurationManager.CONFIG_SECTION);
        await config.update('maxFileSize', size, true);
    }

    /**
     * Sets the autoOpen setting for the chat browser.
     *
     * @public
     * 
     * @param {boolean} enabled - The new value for the autoOpen setting.
     * @returns {Promise<void>}
     */
    public async setAutoOpen(enabled: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(GeneralConfigurationManager.CONFIG_SECTION);
        await config.update('autoOpen', enabled, true);
    }

    /**
     * Sets the theme for the chat browser.
     *  
     * @public
     * 
     * @param {ThemeMode} theme - The new theme mode.
     * @returns {Promise<void>}
     */
    public async setTheme(theme: ThemeMode): Promise<void> {
        if (!Object.values(ThemeMode).includes(theme)) {
            throw new Error(`Invalid theme mode: ${theme}`);
        }
        const config = vscode.workspace.getConfiguration(GeneralConfigurationManager.CONFIG_SECTION);
        await config.update('theme', theme, true);
    }

    /**
     * Updates the caching settings in the VS Code workspace settings.
     *
     * @public
     * 
     * @param {Partial<CacheConfig>} cacheConfig - The new cache configuration settings.
     * @returns {Promise<void>}
     */
    public async updateCacheConfig(cacheConfig: Partial<CacheConfig>): Promise<void> {
        const config = vscode.workspace.getConfiguration(GeneralConfigurationManager.CONFIG_SECTION);
        
        if (cacheConfig.enabled !== undefined) {
            await config.update('caching.enabled', cacheConfig.enabled, true);
        }
        if (cacheConfig.maxSize !== undefined && cacheConfig.maxSize > 0) {
            await config.update('caching.maxSize', cacheConfig.maxSize, true);
        }
        if (cacheConfig.clearOnExit !== undefined) {
            await config.update('caching.clearOnExit', cacheConfig.clearOnExit, true);
        }
    }

    /**
     * Returns the current value of the autoOpen setting.
     *
     * @public
     * 
     * @returns {boolean}
     */
    public shouldAutoOpen(): boolean {
        return this.config.autoOpen;
    }

    /**
     * Returns the current theme mode.
     *
     * @public
     * @returns {ThemeMode}*/
    public getCurrentTheme(): ThemeMode {
        return this.config.theme;
    }

    /**
     * Returns the current maximum file size for file caching.
     *
     * @public
     * @returns {number}*/
    public getMaxFileSize(): number {
        return this.config.maxFileSize;
    }

    /**
     * Retrieves the current cache configuration settings
     * 
     * @public
     * @returns {CacheConfig} The current cache configuration
     */
    public getCacheConfig(): CacheConfig {
        return { ...this.config.caching };
    }

    /**
     * Returns the current cache size in bytes.
     *
     * @public
     * @returns {number}*/
    public getCurrentCacheSize(): number {
        return this.cacheSize;
    }

    /**
     * Adds a specified size to the cache.
     *
     * @public
     * 
     * @param {number} size - The size to add to the cache in bytes.
     * @returns {Promise<boolean>} - True if the cache was updated, false if the cache is full.
     */
    public async addToCache(size: number): Promise<boolean> {
        if (!this.config.caching.enabled) {
            return false;
        }

        const newSize = this.cacheSize + size;
        if (newSize > this.config.caching.maxSize) {
            this.emit('cacheFull', {
                current: this.cacheSize,
                attempted: size,
                maximum: this.config.caching.maxSize
            });
            return false;
        }

        this.cacheSize = newSize;
        await this.context.globalState.update('cacheSize', this.cacheSize);
        return true;
    }

    /**
     * Clears the cache.
     *
     * @public
     * 
     * @returns {Promise<void>}
     */
    public async clearCache(): Promise<void> {
        this.cacheSize = 0;
        await this.context.globalState.update('cacheSize', 0);
        this.emit('cacheCleared');
    }

    /**
     * Returns the documentation for the settings.
     *
     * @public
     * @returns { {[key: string]: string}}*/
    public getSettingDocumentation(): { [key: string]: string } {
        return {
            'maxFileSize': 'Maximum size of log files that can be loaded (in bytes)',
            'autoOpen': 'Automatically open chat browser when log file is selected',
            'theme': 'UI theme mode (auto, light, dark)',
            'caching.enabled': 'Enable caching of parsed log files',
            'caching.maxSize': 'Maximum cache size in bytes',
            'caching.clearOnExit': 'Clear cache when VS Code closes'
        };
    }

    /**
     * Disposes of the configuration manager and clears the cache if enabled.
     *
     * @public
     * @returns {void}*/
    public dispose():void {
        if (this.config.caching.clearOnExit) {
            this.clearCache();
        }
        this.disposables.forEach(d => d.dispose());
    }
}
