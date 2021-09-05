import { Sycamore } from './Sycamore';
import { Bindable } from 'curvature/base/Bindable';
import { Model } from 'curvature/model/Model';

import { Config } from 'curvature/base/Config';
import { View } from 'curvature/base/View';
import { Form } from 'curvature/form/Form';

import { MessageView } from './MessageView';
import { MessageModel } from './MessageModel';

import { MessageLinkView } from './MessageLinkView';
import { MessageImageView } from './MessageImageView';
import { MessageAudioView } from './MessageAudioView';
import { MessageVideoView } from './MessageVideoView';
import { MessageYoutubeView } from './MessageYoutubeView';

import { UserModel } from './UserModel';
import { Router } from 'curvature/base/Router';

import { UserDatabase } from './UserDatabase';

import { SocialDatabase } from './activity-pub/SocialDatabase';

import { Github } from './Github';

import { EventModel as MatrixEvent } from './matrix/EventModel';

import { ActorModel } from './activity-pub/ActorModel';
import { NoteModel } from './activity-pub/NoteModel';
import { NoteView } from './activity-pub/NoteView';

import { Collection } from './activity-pub/Collection';

export class FeedView extends View
{
	template  = require('feed.html');
	listeners = new Map;
	profiles  = new Map;
	postSet   = new Set;

	constructor(args)
	{
		super(args);

		this.args.messages = this.args.messages || [];

		this.args.donateAmount = 10;
		this.args.showControls = true;
		this.args.showForm     = true;

		this.messageViews = new Map;

		let ready;

		this.index = 'type+room_id+time';
		this.page  = 1;

		if(Router.query.external)
		{
			this.args.path = this.args.path || '/remote?external=' + Router.query.external;

			// ActorModel.fetchWebFinger('@' + args.globalId)
			// 	.then(fingerResult => ActorModel.findProfileLink(fingerResult))
			// 	.then(userLink => ActorModel.fetchActor(userLink))
			// 	.then(result => result.outbox)
			// 	.then(url => )

		}
		else
		{
			this.args.path = this.args.path || '/ap/actor/sean/outbox';

			SocialDatabase.open('activitypub', 1).then(database => {
				this.listen(database, 'write', event => {

					if(event.detail.subType !== 'insert')
					{
						return;
					}

					if(!event.detail.record || event.detail.record.inReplyTo)
					{
						return;
					}

					this.args.messages.push(new NoteView(event.detail.record));

				});
			});
		}

		const collection = new Collection(this.args.path);

		collection.each(item => {

			const frozen = item.object ? item.object.id : item.id;

			NoteModel.get(frozen).then(model => {

				if(model.inReplyTo)
				{
					return;
				}

				const view = new NoteView(model);

				this.args.messages.push(view);

			});
		});

		// const getUrl = Config.get('backend').then(backend => backend + args.path);

		// getUrl
		// .then(url => fetch(url))
		// .then(r=>r.json())
		// .then(outbox => fetch(outbox.last))
		// .then(r=>r.json())
		// .then(outbox => (outbox.orderedItems||[]).map(item => NoteModel.get(item.object ? item.object.id : item.id)))
		// .then(getModels => Promise.all(getModels))
		// .then(models => models.filter(item => !item.inReplyTo).map(model => new NoteView(model)))
		// .then(views => views.map(view => this.args.messages.push(view)));

		// if(this.args.room_id)
		// {
		// 	ready = Promise.resolve();

		// 	this.selectors = [IDBKeyRange.bound(
		// 		['m.room.message', this.args.room_id, 0]
		// 		, ['m.room.message', this.args.room_id, Infinity]
		// 	)];

		// 	Sycamore.getSettings().then(settings => {
		// 		if(!settings.following)
		// 		{
		// 			return;
		// 		}

		// 		this.args.following = settings.following.includes(this.args.room_id);
		// 	});
		// }
		// else
		// {
		// 	ready = Sycamore.getFollowList().then(list => {

		// 		if(!list)
		// 		{
		// 			return false;
		// 		}

		// 		this.selectors = list.map(entry =>IDBKeyRange.bound(
		// 			['m.room.message', entry, 0]
		// 			, ['m.room.message', entry, Infinity]
		// 		));
		// 	});
		// }

		// Promise.all([EventDatabase.open('events', 1), matrix.getToken(), ready]).then(([database, token])=>{

		// 	if(this.args.room_id)
		// 	{
		// 		this.listen(matrix, 'login', () => this.afterLogin());
		// 		this.afterLogin();

		// 		this.syncHistory( this.args.room_id );
		// 	}

		// 	database.addEventListener('write', dbEvent => {
		// 		if(dbEvent.detail.subType !== 'insert')
		// 		{
		// 			return;
		// 		}

		// 		const event = dbEvent.detail.record;

		// 		if(event.room_id === undefined || event.type !== 'm.room.message')
		// 		{
		// 			return;
		// 		}

		// 		const eventKey = [event.room_id, event.type, event.received];

		// 		if(!this.selectors || !this.selectors.filter(s => s.includes(eventKey)))
		// 		{
		// 			return;
		// 		}

		// 		const messageView = this.getEventView(event);

		// 		this.args.posts.push(messageView);
		// 	});

		// 	if(this.args.room_id)
		// 	{
		// 		const controller = matrix.listenForRoomEvents(this.args.room_id);

		// 		this.onRemove(() => controller.cancelled = true);

		// 		this.listeners.set(this.args.room_id, controller);
		// 	}

		// 	this.loadFeeds();
		// });
	}

	// afterLogin()
	// {
	// 	const getToken = matrix.getToken();
	// 	const getState = matrix.getRoomState(this.args.room_id);

	// 	Promise.all([getToken, getState]).then(([token, response]) => {
	// 		response
	// 		.filter(event => event.type === 'm.room.power_levels')
	// 		.forEach(event => {

	// 			if(token.user_id in event.content.users)
	// 			{
	// 				this.args.showForm = true;
	// 			}
	// 		})
	// 	});
	// }

	// loadFeeds(feedUrl)
	// {
	// 	EventDatabase.open('events', 1).then(database => {

	// 		if(!this.selectors)
	// 		{
	// 			return;
	// 		}

	// 		const ranges = this.selectors;
	// 		const index = this.index;
	// 		const store = 'events';
	// 		const limit = 0;

	// 		const direction = 'prev';

	// 		const posts = [];

	// 		// console.log(this.selectors);

	// 		database.select({store, index, ranges, direction, limit}).each(event => {

	// 			const user_id = event.sender || event.user_id;

	// 			const messageView = this.getEventView(event);

	// 			this.getProfile(user_id).then(profile => {

	// 				if(!profile.avatar_url_local)
	// 				{
	// 					return;
	// 				}

	// 				messageView.args.avatar = profile.avatar_url_local;
	// 			});

	// 			messageView.preserve = true;

	// 			this.onRemove(()=>messageView.remove());

	// 			posts.push(messageView);

	// 		}).then(views => {

	// 			this.args.posts.push(...posts);

	// 		});
	// 	});
	// }

	// getEventView(event)
	// {
	// 	if(this.messageViews.has(event.event_id))
	// 	{
	// 		return this.messageViews.get(event.event_id);
	// 	}

	// 	let messageView;

	// 	const user_id = event.sender || event.user_id;

	// 	switch(event.content.msgtype)
	// 	{
	// 		case 'm.audio':
	// 			messageView = new MessageAudioView({
	// 				issued:    event.origin_server_ts / 1000
	// 				, order:   Date.now() - event.origin_server_ts
	// 				, body:    event.content.body
	// 				, header:  Bindable.make({ author: user_id })
	// 				, avatar: '/avatar.jpg'
	// 				, eventId: event.event_id
	// 				, roomId:  event.room_id
	// 				, source:  JSON.stringify(event.content, null, 4)
	// 				, event
	// 			});

	// 			matrix.getMedia(event.content.url).then(localUrl => {
	// 				messageView.args.url = localUrl;
	// 			});
	// 			break;
	// 		case 'm.video':
	// 			messageView = new MessageVideoView({
	// 				issued:    event.origin_server_ts / 1000
	// 				, order:   Date.now() - event.origin_server_ts
	// 				, body:    event.content.body
	// 				, header:  Bindable.make({ author: user_id })
	// 				, avatar: '/avatar.jpg'
	// 				, eventId: event.event_id
	// 				, roomId:  event.room_id
	// 				, source:  JSON.stringify(event.content, null, 4)
	// 				, event
	// 			});

	// 			matrix.getMedia(event.content.url).then(localUrl => {
	// 				messageView.args.url = localUrl;
	// 			});
	// 			break;
	// 		case 'm.image':
	// 			messageView = new MessageImageView({
	// 				issued:    event.origin_server_ts / 1000
	// 				, order:   Date.now() - event.origin_server_ts
	// 				, body:    event.content.body
	// 				, header:  Bindable.make({ author: user_id })
	// 				, avatar: '/avatar.jpg'
	// 				, eventId: event.event_id
	// 				, roomId:  event.room_id
	// 				, source:  JSON.stringify(event.content, null, 4)
	// 				, event
	// 			});

	// 			break;

	// 		default:
	// 			messageView = new MessageView({
	// 				issued:    event.origin_server_ts / 1000
	// 				, order:   Date.now() - event.origin_server_ts
	// 				, body:    event.content.body
	// 				, type:    event.type
	// 				, header:  Bindable.make({ author: user_id ?? null })
	// 				, avatar: '/avatar.jpg'
	// 				, eventId: event.event_id
	// 				, roomId:  event.room_id
	// 				, source:  JSON.stringify(event, null, 4)
	// 				, event
	// 			});
	// 	}

	// 	switch(event.content.msgtype)
	// 	{
	// 		case 'm.audio':
	// 		case 'm.video':
	// 		case 'm.image':
	// 			matrix.getMedia(event.content.url).then(localUrl => {
	// 				messageView.args.url = localUrl;
	// 				fetch(localUrl).then(response => response.arrayBuffer()).then(fileBuffer => {

	// 					if(!event.content || !event.content.info)
	// 					{
	// 						return;
	// 					}

	// 					const file = new File([fileBuffer], event.content.body, {type: event.content.info.type});
	// 				});
	// 			});

	// 			// const getFromOrigin = setTimeout(()=>{
	// 			// }, 1500);

	// 			// if(event.content.sycamore && event.content.sycamore.magnet)
	// 			// {
	// 			// 	webTorrentSeed.add(event.content.sycamore.magnet, torrent => {
	// 			// 		for(const file of torrent.files)
	// 			// 		{
	// 			// 			file.getBlobURL((error, url) => {
	// 			// 				if(!error)
	// 			// 				{
	// 			// 					clearTimeout(getFromOrigin);
	// 			// 					messageView.args.url = url;
	// 			// 					return;
	// 			// 				}
	// 			// 			});
	// 			// 			break;
	// 			// 		}
	// 			// 		torrent.on('done', () => {
	// 			// 		})
	// 			// 	});
	// 			// }

	// 			break;
	// 	}


	// 	if(event.content.sycamore
	// 		&& event.content.sycamore.public
	// 		&& !this.listeners.has(event.content.sycamore.public)
	// 	){
	// 		this.syncHistory(event.content.sycamore.public);

	// 		const controller = matrix.listenForRoomEvents(event.content.sycamore.public);

	// 		this.onRemove(() => controller.cancelled = true);

	// 		this.listeners.set(event.content.sycamore.public, controller);
	// 	}

	// 	messageView.preserve = true;

	// 	this.messageViews.set(event.event_id, messageView);

	// 	return messageView;
	// }

	// loadFeed(feed)
	// {
	// 	fetch('/' + feed).then(response => response.text()).then(feed => {

	// 		const messageLines = feed.split(/\n/);

	// 		for(const messageLine of messageLines)
	// 		{
	// 			if(!messageLine) { continue; }

	// 			const [messageTime, messageUrl] = messageLine.split(/\s/);

	// 			this.loadMessage(messageUrl);
	// 		}
	// 	});
	// }

	// getProfile(userId)
	// {
	// 	let getProfile = Promise.resolve({});

	// 	if(this.profiles.has(userId))
	// 	{
	// 		getProfile = Promise.resolve(this.profiles.get(userId));
	// 	}
	// 	else if(userId)
	// 	{
	// 		const profile = {};

	// 		getProfile = matrix.getUserProfile(userId).then(response => {

	// 			Object.assign(profile, response);

	// 			return response;
	// 		});
	// 	}

	// 	return getProfile.then(profile => {

	// 		if(profile.avatar_url_local)
	// 		{
	// 			return Promise.resolve(profile);
	// 		}

	// 		if(profile.avatar_url)
	// 		{
	// 			const getMedia = matrix.getMedia(profile.avatar_url);

	// 			return getMedia.then(blobUrl => {

	// 				profile.avatar_url_local = blobUrl;

	// 				this.profiles.set(userId, profile);

	// 				return profile;
	// 			});
	// 		}

	// 		this.profiles.set(userId, profile);

	// 		return Promise.resolve(profile);
	// 	});
	// }

	// loadMessage(messageUrl)
	// {
	// 	fetch('/messages/' + messageUrl + '.smsg')
	// 	.then(response => response.arrayBuffer())
	// 	.then(buffer   => MessageModel.fromBytes(buffer))
	// 	.then(message  => this.displayPost(message));
	// }

	// displayPost(message)
	// {
	// 	if(!message || !message.url || this.postSet.has(message.url))
	// 	{
	// 		return;
	// 	}

	// 	const mime = message.header.mime.split(/[\/\s]/);
	// 	const type = mime[0] === 'text'
	// 		? message.name.split('.').pop()
	// 		: mime[0];

	// 	switch(type)
	// 	{
	// 		case 'image':
	// 			this.args.posts.push(new MessageImageView(message));
	// 			break;

	// 		case 'video':
	// 			this.args.posts.push(new MessageVideoView(message));
	// 			break;

	// 		case 'audio':
	// 			this.args.posts.push(new MessageAudioView(message));
	// 			break;

	// 		case 'url':
	// 			const url = new URL(message.body);

	// 			switch(url.host)
	// 			{
	// 				case 'youtube.com':
	// 				case 'www.youtube.com':

	// 					message.videoStart = parseInt(url.searchParams.get('t')) || 0;
	// 					message.videoCode  = url.searchParams.get('v');

	// 					this.args.posts.push(new MessageYoutubeView(message));
	// 					break;

	// 				default:
	// 					this.args.posts.push(new MessageLinkView(message));
	// 					break;
	// 			}
	// 			break;

	// 		default:
	// 			this.args.posts.push(new MessageView(message));
	// 			break;
	// 	}

	// 	this.postSet.add(message.url);
	// }

	createPost(event)
	{
		event.preventDefault();

		NoteModel.createPost(this.args.inputPost)
			.finally(() => this.args.inputPost = '');

		// const path   = '/ap/actor/sean/outbox';
		// const method = 'POST';

		// const body = JSON.stringify({
		// 	'@context': 'https://www.w3.org/ns/activitystreams'
		// 	, type: 'Create'
		// 	, object: {
		// 		content: this.args.inputPost
		// 		, type: 'Note'
		// 	}
		// });

		// const mode = 'cors';
		// const options = {method, body, mode, credentials: 'include'};

		// Config.get('backend')
		// .then(backend => fetch(backend + path, options))
		// .then(r=>r.json())
		// .then(outbox => fetch(outbox.last))
		// .then(r=>r.json())
		// .then(outbox => outbox.orderedItems.forEach(item => {
		// 	NoteModel.get(item.id);
		// }))

		// NoteModel.get(item.id);

		// Sycamore.getSettings().then(settings => {
		// 	const message = {
		// 		msgtype: 'm.text'
		// 		, body:  this.args.inputPost
		// 		, sycamore: {
		// 			profile:   'https://sycamore.seanmorr.is/'
		// 			, private: settings.privateFeed
		// 			, public:  settings.publicFeed
		// 		}
		// 	};

		// 	return matrix.putEvent(this.args.room_id, 'm.room.message', message)

		// }).then(() => {

		// 	this.args.inputPost = '';

		// });
	}

	fileDropped(event)
	{
		event.preventDefault();
		event.stopPropagation();

		// for(const item of event.dataTransfer.items)
		// {
		// 	const file = item.getAsFile();
		// 	const baseType = file.type.split('/')[0];

		// 	webTorrent.seed(file, torrent => {
		// 		console.log(torrent);
		// 		switch(baseType)
		// 		{
		// 			case 'image':
		// 			case 'video':
		// 			case 'audio': {
		// 				matrix.postMedia(file, file.name).then(response => {
		// 					matrix.putEvent(this.args.room_id, 'm.room.message', {
		// 						msgtype: 'm.' + baseType
		// 						, sycamore: { magnet: torrent.magnetURI }
		// 						, body:  file.name
		// 						, url:   response.content_uri
		// 						, info: { type: file.type }
		// 					});
		// 				});
		// 				break;
		// 			}
		// 			default: {
		// 				matrix.postMedia(file, file.name).then(response => {
		// 					matrix.putEvent(this.args.room_id, 'm.room.message', {
		// 						msgtype: 'm.file'
		// 						, sycamore: { magnet: torrent.magnetURI }
		// 						, body:  file.name
		// 						, url:   response.content_uri
		// 						, info: { type: file.type }
		// 					});
		// 				});
		// 				break;
		// 			}
		// 		}
		// 	});
		// }
	}

	fileDragged(event)
	{
		event.preventDefault();
		event.stopPropagation();
	}

	follow(event)
	{
		event.preventDefault();

		// Sycamore.followFeed(this.args.room_id).then(this.args.following = true);
	}

	unfollow(event)
	{
		console.log(event);

		event.preventDefault();

		// Sycamore.unfollowFeed(this.args.room_id).then(this.args.following = false);
	}

	subscribe()
	{
		this.args.paybox = !(this.args.paybox || false);
	}

	unsubscribe()
	{
		this.args.paybox = !(this.args.paybox || false);
	}
}
