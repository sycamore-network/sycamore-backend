import { Config } from 'curvature/base/Config';
import { Model } from 'curvature/model/Model';
import { SocialDatabase } from './SocialDatabase';

export class NoteModel extends Model
{
	static get keyProps() { return ['id'] }

	id;
	type;
	published;
	inReplyTo;
	content;
	to;

	static from(skeleton)
	{
		const instance = super.from(skeleton);

		const url = new URL(instance.id);

		instance.timestamp = Date.parse(skeleton.published);

		return instance;
	}

	static get(id)
	{
		const direction = 'next';
		const range = IDBKeyRange.only(id);
		const index = 'id';
		const store = 'objects';
		const limit = 0;

		return SocialDatabase.open('activitypub', 1).then(database => database
			.select({store, index, range, direction, limit}).one()
			.then(results => results.index
				? this.from(results.record)
				: this.getRemote(id)
			)
		);
	}

	static getRemote(id)
	{
		const fetchRemote = fetch(id)
			.then(r => r.json())
			.then(response => this.from(response));

		const range = IDBKeyRange.only(id);
		const index = 'id';
		const store = 'objects';
		const limit = 0;
		const type  = this;

		const prereq = Promise.all([SocialDatabase.open('activitypub', 1), fetchRemote.then()])

		prereq.then(([database, object]) => {
			database.select({store, index, range, type}).one()
			.then(result => result.index
				? database.update('objects', object)
				: database.insert('objects', object)
			);
		});

		return fetchRemote;
	}

	static createPost(content, inReplyTo)
	{
		const path   = '/ap/actor/sean/outbox';
		const method = 'POST';

		const body = JSON.stringify({
			'@context': 'https://www.w3.org/ns/activitystreams'
			, type: 'Create'
			, object: {
				content: content
				, inReplyTo
				, type: 'Note'
			}
		});

		const mode = 'cors';
		const options = {method, body, mode, credentials: 'include'};

		Config.get('backend')
		.then(backend => fetch(backend + path, options))
		.then(r=>r.json())
		.then(outbox => fetch(outbox.last))
		.then(r=>r.json())
		.then(outbox => outbox.orderedItems.forEach(item => {
			NoteModel.get(item.id);
		}));
	}
}
