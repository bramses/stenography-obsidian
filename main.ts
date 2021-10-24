import { App, Plugin, PluginSettingTab, Setting, MarkdownView, Notice } from 'obsidian';

interface StenographyPluginSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: StenographyPluginSettings = {
	apiKey: ''
}

export default class StenographyPlugin extends Plugin {
	settings: StenographyPluginSettings;

	async onload() {
		console.log('loading stenography plugin');
		await this.loadSettings();

		this.addRibbonIcon('code-glyph', 'Stenography', async () => {
			await this.stenographyWorkflow();
		});

		this.addCommand({
			id: 'run-stenograpy',
			name: 'Run Stenography',
			callback: async () => {
				await this.stenographyWorkflow();
			}
		});

		this.addSettingTab(new StenographyPluginTab(this.app, this));


	}

	async stenographyWorkflow() {
		try {
			if (this.app.workspace.getActiveViewOfType(MarkdownView)) {
				const editor = this.app.workspace.getActiveViewOfType(MarkdownView).editor;
				const selectedText = editor.getSelection(); // Get selected text
				if (selectedText && selectedText.length > 0) {
					const res = await this.fetchStenography(selectedText)
					editor.replaceSelection(`${res.res}\n\n\`\`\`${res.language}\n${selectedText}\n\`\`\`\n\n`)
				}
			} else {
				throw new Error('MarkdownView is null');
			}
		} catch (err) {
			new Notice(err.message);
		}
	}

	async fetchStenography(code: string): Promise < any > {
		const statusHTML = this.addStatusBarItem()
		statusHTML.setText('Loading from Stenography...');
		try {
			const res = await fetch('https://stenography-worker.stenography.workers.dev',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json;charset=UTF-8' },
				body: JSON.stringify({
					code: code,
					api_key: this.settings.apiKey,
					audience: 'pm',
					populate: false,
					stackoverflow: false
				})
			})
			const data = await res.json();
			const markdown = data.pm
			const language = data.metadata.language || ''
			if (markdown && Object.keys(markdown).length === 0 && Object.getPrototypeOf(markdown) === Object.prototype) {
				return { res: `Stenography response empty!`, language: '' }
			}
			return { res: markdown, language: language }
		} catch(err) {
			if (err.message.includes('Failed to fetch')) { return { res: `Error loading from Stenography! API key error, did you set it in settings?`, language: '' } }
			else return { res: `Error loading from Stenography! Error: ${err}`, language: '' }
		} finally {
			statusHTML.remove();
		}

	}

	onunload() {
		console.log('unloading stenography plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class StenographyPluginTab extends PluginSettingTab {
	plugin: StenographyPlugin;

	constructor(app: App, plugin: StenographyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Settings for Stenography.' });

		// for api key
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Get your API key here: https://stenography.dev/dashboard')
			.addText(text => text
				.setPlaceholder('xxxx-xxxx-xxxx-xxxx')
				.setValue('')
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
					new Notice('Saved API key!');
				}));
	}
}
