<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');

/*
|--------------------------------------------------------------------------
| НАСТРОЙКИ
|--------------------------------------------------------------------------
*/

const YOUTUBE_API_KEY    = 'AIzaSyD0vGXN-0ex8ZuNvQIpJLb2nLi9bxxW_60';
const YOUTUBE_CHANNEL_ID = 'UCiPAo8p9-5-OJ3zvDcLW94A';

const CACHE_TTL  = 21600; // обновление каждые 6 часов
const CACHE_FILE = __DIR__ . '/yt_cache.json';

const MAX_RESULTS = 30;

/*
|--------------------------------------------------------------------------
| ВЫВОД JSON
|--------------------------------------------------------------------------
*/

function json_out(array $payload, int $code = 200): void
{
    http_response_code($code);

    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}

/*
|--------------------------------------------------------------------------
| КЕШ
|--------------------------------------------------------------------------
*/

$forceRefresh = isset($_GET['nocache']);

if (
    !$forceRefresh &&
    file_exists(CACHE_FILE)
) {
    $raw = file_get_contents(CACHE_FILE);

    if ($raw) {
        $cache = json_decode($raw, true);

        if (
            is_array($cache) &&
            isset($cache['ts']) &&
            time() - (int)$cache['ts'] < CACHE_TTL
        ) {
            $result = $cache['data'];

            $result['_cache'] = 'hit';

            json_out($result);
        }
    }
}

/*
|--------------------------------------------------------------------------
| HTTP
|--------------------------------------------------------------------------
*/

function http_get(string $url): array
{
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'Emphaseas Website'
    ]);

    $response = curl_exec($ch);

    if ($response === false) {
        throw new RuntimeException(curl_error($ch));
    }

    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException(
            'YouTube API HTTP ' . $status
        );
    }

    $json = json_decode($response, true);

    if (!is_array($json)) {
        throw new RuntimeException(
            'Invalid JSON response'
        );
    }

    if (isset($json['error'])) {
        throw new RuntimeException(
            $json['error']['message'] ?? 'YouTube API Error'
        );
    }

    return $json;
}

function yt_url(string $endpoint, array $params): string
{
    return 'https://www.googleapis.com/youtube/v3/' .
        $endpoint .
        '?' .
        http_build_query($params);
}

/*
|--------------------------------------------------------------------------
| ISO 8601 -> seconds
|--------------------------------------------------------------------------
*/

function iso_to_seconds(string $duration): int
{
    $interval = new DateInterval($duration);

    return
        ($interval->d * 86400) +
        ($interval->h * 3600) +
        ($interval->i * 60) +
        $interval->s;
}

/*
|--------------------------------------------------------------------------
| SHORTS
|--------------------------------------------------------------------------
*/

function is_short(array $video): bool
{
    $duration = iso_to_seconds(
        $video['contentDetails']['duration'] ?? 'PT0S'
    );

    $snippet = $video['snippet'] ?? [];

    $title = mb_strtolower(
        $snippet['title'] ?? '',
        'UTF-8'
    );

    $description = mb_strtolower(
        $snippet['description'] ?? '',
        'UTF-8'
    );

    if (
        str_contains($title, '#shorts') ||
        str_contains($description, '#shorts')
    ) {
        return true;
    }

    // На всякий случай
    if ($duration > 0 && $duration <= 180) {
        return true;
    }

    return false;
}

/*
|--------------------------------------------------------------------------
| СТРИМЫ
|--------------------------------------------------------------------------
*/

function is_stream(array $video): bool
{
    if (!empty($video['liveStreamingDetails'])) {
        return true;
    }

    $snippet = $video['snippet'] ?? [];

    $text = mb_strtolower(
        ($snippet['title'] ?? '') .
        ' ' .
        ($snippet['description'] ?? ''),
        'UTF-8'
    );

    foreach (
        [
            '#live',
            '#stream',
            'livestream',
            'live stream',
            'прямой эфир'
        ] as $word
    ) {
        if (str_contains($text, $word)) {
            return true;
        }
    }

    return false;
}

try {

    /*
    |--------------------------------------------------------------------------
    | Получаем uploads playlist канала
    |--------------------------------------------------------------------------
    */

    $channel = http_get(
        yt_url('channels', [
            'key' => YOUTUBE_API_KEY,
            'id' => YOUTUBE_CHANNEL_ID,
            'part' => 'contentDetails'
        ])
    );

    if (empty($channel['items'][0])) {
        throw new RuntimeException(
            'Канал не найден'
        );
    }

    $uploadsPlaylistId =
        $channel['items'][0]
        ['contentDetails']
        ['relatedPlaylists']
        ['uploads'];

    /*
    |--------------------------------------------------------------------------
    | Последние загрузки
    |--------------------------------------------------------------------------
    */

    $playlist = http_get(
        yt_url('playlistItems', [
            'key' => YOUTUBE_API_KEY,
            'playlistId' => $uploadsPlaylistId,
            'part' => 'contentDetails',
            'maxResults' => MAX_RESULTS
        ])
    );

    $videoIds = [];

    foreach ($playlist['items'] as $item) {

        $videoId =
            $item['contentDetails']['videoId']
            ?? null;

        if ($videoId) {
            $videoIds[] = $videoId;
        }
    }

    if (!$videoIds) {
        throw new RuntimeException(
            'Видео не найдены'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Детали видео
    |--------------------------------------------------------------------------
    */

    $videos = http_get(
        yt_url('videos', [
            'key' => YOUTUBE_API_KEY,
            'id' => implode(',', $videoIds),
            'part' =>
                'snippet,contentDetails,status,liveStreamingDetails'
        ])
    );

    $videosMap = [];

    foreach ($videos['items'] as $video) {
        $videosMap[$video['id']] = $video;
    }

    /*
    |--------------------------------------------------------------------------
    | ВАЖНО:
    | Сохраняем порядок из uploads playlist
    |--------------------------------------------------------------------------
    */

    foreach ($videoIds as $videoId) {

        if (!isset($videosMap[$videoId])) {
            continue;
        }

        $video = $videosMap[$videoId];

        if (
            ($video['status']['privacyStatus'] ?? '')
            !== 'public'
        ) {
            continue;
        }

        if (is_stream($video)) {
            continue;
        }

        if (is_short($video)) {
            continue;
        }

        $snippet = $video['snippet'];

        $thumbs = $snippet['thumbnails'] ?? [];

        $thumbnail =
            $thumbs['maxres']['url']
            ?? $thumbs['standard']['url']
            ?? $thumbs['high']['url']
            ?? $thumbs['medium']['url']
            ?? $thumbs['default']['url']
            ?? '';

        $result = [
            'ok' => true,
            'video' => [
                'id' => $videoId,
                'url' => 'https://www.youtube.com/watch?v=' . $videoId,
                'title' => $snippet['title'] ?? '',
                'description' => $snippet['description'] ?? '',
                'thumbnail' => $thumbnail,
                'publishedAt' => $snippet['publishedAt'] ?? '',
                'durationSeconds' => iso_to_seconds(
                    $video['contentDetails']['duration']
                )
            ],
            '_cache' => 'miss'
        ];

        file_put_contents(
            CACHE_FILE,
            json_encode([
                'ts' => time(),
                'data' => $result
            ], JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );

        json_out($result);
    }

    json_out([
        'ok' => false,
        'error' => 'Не найдено подходящих видео'
    ], 404);

} catch (Throwable $e) {

    json_out([
        'ok' => false,
        'error' => $e->getMessage()
    ], 500);
}