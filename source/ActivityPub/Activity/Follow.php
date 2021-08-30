<?php
namespace SeanMorris\Sycamore\ActivityPub\Activity;

use \SeanMorris\Ids\Settings;
use \SeanMorris\Sycamore\ActivityPub\Type\Follower;
use \SeanMorris\Sycamore\ActivityPub\Type\BaseObject;

class Follow extends Activity
{
	const CONTEXT = 'https://www.w3.org/ns/activitystreams';
	const TYPE = 'Follow';

	protected $object;
	protected $actor;
	protected $id;

	public static function consume($values)
	{
		$values = (object) $values;
		$object = NULL;

		if($values->object ?? NULL)
		{
			$object = Follower::consume($values->object);
		}

		$instance = new static($object);

		$instance->id     = $values->id    ?? NULL;
		$instance->actor  = $values->actor ?? NULL;
		$instance->object = $object        ?? NULL;

		return $instance;
	}

	public function store($collectionId)
	{
		$this->object->store($collectionId);

		$redis = Settings::get('redis');

		$actorName = 'sean';

		if(!$this->id)
		{
			$this->id = $this->actor . '/activity/' . uniqid();

			$redis->hset(
				'activity-pub::activities::' . $actorName
				, $this->id
				, json_encode($this->unconsume())
			);
		}
	}
}
