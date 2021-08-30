<?php
namespace SeanMorris\Sycamore\ActivityPub;

use \SeanMorris\Ids\Log;
use \SeanMorris\Ids\Settings;
use \SeanMorris\Sycamore\ActivityPub\Activity\Create;
use \SeanMorris\Sycamore\ActivityPub\Activity\Activity;
use \SeanMorris\Sycamore\ActivityPub\Collection\Ordered;

class Inbox extends Ordered
{
	protected $collectionRoot = 'activity-pub::inbox::objects::';
	protected $canonical = '/ap/actor/sean/inbox';
	protected $actorName = 'sean';

	public function index($router)
	{
		$get = $router->request()->get();

		header('Content-Type: text/html');

		if($router->request()->method() === 'POST')
		{
			Log::debug($router->request()->headers());

			if(!$activitySource = file_get_contents('php://input'))
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'No data supplied.'
				);
			}

			$frozenActivity = json_decode($activitySource);

			Log::debug($activitySource, $frozenActivity);

			$activityType = Activity::getType($frozenActivity->type);

			$activity = $activityType::consume($frozenActivity);

			Log::debug($activityType, $activity);

			if(!$activity)
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'Invalid or insufficient data supplied.'
				);
			}

			if(!$activity->object || !$activity->actor)
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'Invalid or insufficient data supplied.'
				);
			}

			$rawSignature = $router->request()->headers('Signature');

			$sigPairs = explode(',', $rawSignature);

			$signature = [];

			$build = function($pair) use(&$signature) {parse_str($pair, $sig); $signature += $sig;};

			array_map($build, $sigPairs);

			$signature = array_map(
				function($v) { return trim($v, '"') ;}
				, $signature
			);

			Log::debug($activity);

			$actor = $this->getExternalActor($activity->actor);

			Log::debug('Actor: ', $actor);

			if(!$actor)
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'Cannot locate actor.'
				);
			}

			if(!$actor->publicKey || !$actor->publicKey->publicKeyPem)
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'Cannot locate public key.'
				);
			}

			$host = $router->request()->headers('Host');
			$hash = $router->request()->headers('Digest');
			$date = $router->request()->headers('Date');
			$type = $router->request()->headers('Content-Type');

			$time = strtotime($date);

			if(abs($time - time()) > 30)
			{
				throw new \SeanMorris\Ids\Http\Http406(
					'Timestamp is out of range.'
				);
			}

			$requestTarget = sprintf(
				'(request-target): post %s' . PHP_EOL
					. 'host: %s' . PHP_EOL
					. 'date: %s' . PHP_EOL
					. 'digest: %s' . PHP_EOL
					. 'content-type: %s'
				, $this->canonical
				, $host
				, $date
				, $hash
				, $type
			);

			$publicKey = $actor->publicKey->publicKeyPem;

			$sig = base64_decode(str_replace(' ', '+', $signature['signature']));

			Log::debug([
				'requestTarget' => $requestTarget
				, 'sig' => base64_encode($sig)
				, 'publicKey' => $publicKey
			]);

			$userVerified = openssl_verify($requestTarget, $sig, $publicKey, 'sha256WithRSAEncryption');

			Log::debug('userVerified', $userVerified);

			if($userVerified)
			{
				Log::debug($activity::TYPE);
				Log::debug($activity);

				switch($activity::TYPE)
				{
					case 'Create':
						$activity->store($this->getCollectionName());
						break;

					case 'Follow':
						$activity->store('activity-pub::followers::sean');
						break;

					case 'Accept':
						$activity->store('activity-pub::following::sean');
						$activity->store($this->getCollectionName());
						break;

					case 'Reject':
						$activity->store($this->getCollectionName());
						break;

				}
				return TRUE;
			}

			throw new \SeanMorris\Ids\Http\Http401(
				'User verification failed.'
			);
		}

		return parent::index($router);
	}

	protected function createActivity(){}
	protected function followActivity(){}
	protected function acceptActivity(){}
	protected function rejectActivity(){}
	protected function deleteActivity(){}

	protected function getExternalActor($url)
	{
		$context     = stream_context_create($contextSource = ['http' => [
			'ignore_errors' => TRUE
			, 'header' => [
				'Accept: application/ld+json'
			]
		]]);
		$actorSource = file_get_contents($url, FALSE, $context);
		$headers     = print_r($http_response_header, 1) . PHP_EOL;

		Log::debug($actorSource);

		if($actor = json_decode($actorSource))
		{
			return $actor;
		}

		return FALSE;
	}

	public function supportedActivities()
	{
		$activities = Activity::types();

		return json_encode($activities);
	}
}
