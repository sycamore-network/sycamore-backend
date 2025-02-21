import { Sycamore } from './Sycamore';
import { Bindable } from 'curvature/base/Bindable';
import { Model } from 'curvature/model/Model';

import { Config } from 'curvature/base/Config';
import { View } from 'curvature/base/View';
import { Form } from 'curvature/form/Form';
import { Bag } from 'curvature/base/Bag';

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

import { Access } from './Access';

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

		this.messages = new WeakMap;

		this.args.messages = [];

		this.args.donateAmount = 10;
		this.args.showControls = true;
		this.args.showForm     = true;

		let ready;

		let getPath = Promise.resolve();

		if(Router.query.external)
		{
			getPath = Promise.resolve(this.args.path || '/remote?external=' + Router.query.external);
		}
		else
		{
			getPath = Access.whoAmI().then(user => this.args.path || `/ap/actor/${user.username}/outbox`);

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

					if(this.messages.has(model))
					{
						return;
					}

					const model = event.detail.record;
					const view = new NoteView(model);

					this.messages.set(model, view);

					this.args.messages.push(view);
				});
			});
		}

		getPath.then(path => {

			this.args.path = path;

			const collection = new Collection(path);

			collection.each(item => {

				const frozen = item.object ? item.object.id : item.id;

				NoteModel.get(frozen).then(model => {

					if(model.inReplyTo)
					{
						return;
					}

					if(this.messages.has(model))
					{
						return;
					}

					const view = new NoteView(model);

					this.messages.set(model, view);

					this.args.messages.push(view);
				});
			});
		});
	}

	createPost(event)
	{
		event.preventDefault();

		NoteModel.createPost(this.args.inputPost).finally(() => this.args.inputPost = '');
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
