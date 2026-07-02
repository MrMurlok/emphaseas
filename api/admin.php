<?php
declare(strict_types=1);

session_start();

require __DIR__ . '/admin_config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

const CONTENT_FILE = __DIR__ . '/../data/content.json';
const DOWNLOAD_DIR = __DIR__ . '/../assets/downloads';
const AUDIO_DIR = __DIR__ . '/../assets/audio';
const IMAGE_DIR = __DIR__ . '/../assets/img';

function respond(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_admin(): void
{
    if (empty($_SESSION['admin_auth'])) {
        respond(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
}

function read_content(): array
{
    if (!file_exists(CONTENT_FILE)) {
        respond(['ok' => false, 'error' => 'Content file not found'], 500);
    }

    $raw = file_get_contents(CONTENT_FILE);
    $data = json_decode((string)$raw, true);

    if (!is_array($data)) {
        respond(['ok' => false, 'error' => 'Invalid content JSON'], 500);
    }

    return $data;
}

function write_content(array $data): void
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

    if ($json === false || file_put_contents(CONTENT_FILE, $json, LOCK_EX) === false) {
        respond(['ok' => false, 'error' => 'Cannot write content'], 500);
    }
}

function safe_name(string $name): string
{
    $name = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $name);
    $name = trim((string)$name, '.-');
    return $name !== '' ? $name : ('file-' . time());
}

function upload_file(string $field, string $dir, array $allowedExtensions, ?string $fixedName = null): string
{
    if (empty($_FILES[$field])) {
        respond(['ok' => false, 'error' => 'File is required'], 400);
    }

    $file = $_FILES[$field];
    $error = (int)($file['error'] ?? UPLOAD_ERR_OK);
    if ($error !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'File is larger than upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File is larger than form limit',
            UPLOAD_ERR_PARTIAL => 'File was uploaded only partially',
            UPLOAD_ERR_NO_FILE => 'File is required',
            UPLOAD_ERR_NO_TMP_DIR => 'Temporary upload directory is missing',
            UPLOAD_ERR_CANT_WRITE => 'Cannot write uploaded file to disk',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by PHP extension',
        ];
        respond(['ok' => false, 'error' => $messages[$error] ?? ('Upload error ' . $error)], 400);
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        respond(['ok' => false, 'error' => 'Invalid uploaded file'], 400);
    }

    $ext = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExtensions, true)) {
        respond(['ok' => false, 'error' => 'Unsupported file type'], 400);
    }

    if (!is_dir($dir) && !mkdir($dir, 0775, true)) {
        respond(['ok' => false, 'error' => 'Cannot create upload dir'], 500);
    }

    if (!is_writable($dir)) {
        respond(['ok' => false, 'error' => 'Upload dir is not writable: ' . basename($dir)], 500);
    }

    $filename = $fixedName ? safe_name($fixedName) . '.' . $ext : safe_name((string)$file['name']);
    $target = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        respond(['ok' => false, 'error' => 'Cannot move uploaded file'], 500);
    }

    return str_replace('\\', '/', substr($target, strlen(__DIR__ . '/../')));
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'content';

if ($action === 'login') {
    $login = (string)($_POST['login'] ?? '');
    $password = (string)($_POST['password'] ?? '');
    if (hash_equals(ADMIN_LOGIN, $login) && hash_equals(ADMIN_PASSWORD, $password)) {
        $_SESSION['admin_auth'] = true;
        respond(['ok' => true]);
    }
    respond(['ok' => false, 'error' => 'Wrong password'], 403);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'status') {
    respond(['ok' => true, 'authenticated' => !empty($_SESSION['admin_auth'])]);
}

if ($action === 'content') {
    respond(['ok' => true, 'data' => read_content()]);
}

require_admin();

if ($action === 'save') {
    $payload = json_decode((string)($_POST['data'] ?? ''), true);
    if (!is_array($payload)) {
        respond(['ok' => false, 'error' => 'Invalid payload'], 400);
    }
    write_content($payload);
    respond(['ok' => true, 'data' => $payload]);
}

if ($action === 'upload') {
    $type = (string)($_POST['type'] ?? '');
    $content = read_content();

    if ($type === 'massimizer') {
        $old = $content['massimizer']['download'] ?? '';
        $path = upload_file('file', DOWNLOAD_DIR, ['zip']);
        if (is_string($old) && $old !== '' && $old !== $path && strpos($old, 'assets/downloads/') === 0 && file_exists(__DIR__ . '/../' . $old)) {
            @unlink(__DIR__ . '/../' . $old);
        }
        $content['massimizer']['download'] = $path;
        write_content($content);
        respond(['ok' => true, 'path' => $path, 'data' => $content]);
    }

    if ($type === 'audio') {
        $path = upload_file('file', AUDIO_DIR, ['mp3', 'wav', 'ogg', 'm4a']);
        respond(['ok' => true, 'path' => $path]);
    }

    if ($type === 'image') {
        $path = upload_file('file', IMAGE_DIR, ['jpg', 'jpeg', 'png', 'webp']);
        respond(['ok' => true, 'path' => $path]);
    }

    respond(['ok' => false, 'error' => 'Unknown upload type'], 400);
}

respond(['ok' => false, 'error' => 'Unknown action'], 404);
