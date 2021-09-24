import { App, Plugin, PluginSettingTab, Setting, MarkdownView } from 'obsidian';

interface MyPluginSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	apiKey: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log('loading plugin');
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

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});

	}

	async stenographyWorkflow() {
		const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor; 
		const selectedText = editor.getSelection(); // Get selected text
		if (selectedText && selectedText.length > 0) {
			const res = await this.fetchStenography(selectedText)
			editor.replaceSelection(`${res.res}\n\n\`\`\`${res.language}\n${selectedText}\n\`\`\`\n\n`)
		}
	}

	async fetchStenography(code: string): Promise<any> {
	 const statusHTML = this.addStatusBarItem()
	 statusHTML.setText('Loading from Stenography...');
	 return await fetch('https://stenography-worker.stenography.workers.dev',
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json;charset=UTF-8'},
        body: JSON.stringify({
          code: code,
          api_key: this.settings.apiKey,
          audience: 'pm',
          populate: false,
          stackoverflow: false
        })
      }).then(resp => 
      {
        return resp.json()
      }).then((data:any) => {
		var markdown = data.pm
		const language = data.metadata.language || ''
		if (markdown && Object.keys(markdown).length === 0 && Object.getPrototypeOf(markdown) === Object.prototype) {
			return {res: `Stenography response empty!`, language: ''}
		}
		return { res: markdown, language: language }
	  }).catch(err => ({res: `Error loading from Stenography! Error: ${err}`, language: ''}))
	  .finally(() => {
		statusHTML.remove();
	  })
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Stenography.'});

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
				}));		
	}
}
