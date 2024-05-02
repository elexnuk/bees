import { ChannelType, Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { keyv as db } from "./state.js";
import fs from "fs";
import path from "path";
const __dirname = import.meta.dirname;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.commands = new Collection();

const foldersPath = path.join(__dirname, "commands");
const folders = fs.readdirSync(foldersPath);

for (const folder of folders) {
    const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const { data, execute } = await import("file://" + filePath);
		
        if (data && execute) {
			client.commands.set(data.name, { data, execute });
		} else {
			console.log(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.MessageCreate, async message => {
	// check if it's in an election channel
	const channels = await db.get("election_channels");
	for (const channel of channels) {
		if (channel.channel === message.channel.id && message.channel.type == ChannelType.GuildAnnouncement) {
			try {
				await message.crosspost(); // crosspost the message
			} catch (err) {
				console.error(`Failed to crosspost message: ${err}`);
			}
			return;
		}
	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: "There was an error while executing this command.", ephemeral: true });
		} else {
			await interaction.reply({ content: "There was an error while executing this command.", ephemeral: true });
		}
	}
});

client.once(Events.ClientReady, async readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`); 

    client.user.setActivity("Election Results", { type: "WATCHING" });

    const guilds = await readyClient.guilds.fetch();
    for (const guild of guilds.values()) {
        console.log(`Connected to guild: ${guild.name}`);
    }
});

async function sendToChannel(channel_id, message) {
	try {
		const channel = await client.channels.fetch(channel_id);
		await channel.send(message);
	} catch (err) {
		console.error(`Failed to send message to channel ${channel_id}: ${err}`);
	}
}

export { client, sendToChannel };
