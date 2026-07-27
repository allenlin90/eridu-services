import {
  checkSceneReferenceUpload,
  SCENE_REFERENCE_OBJECT_KEY_PREFIX,
} from './scene-reference-upload.policy';

describe('sceneReferenceUploadPolicy', () => {
  const VALID_KEY = 'scene_reference/user_abc/2026-07-27/deadbeef-reference.png';
  const VALID_URL = `https://cdn.example.com/${VALID_KEY}`;

  it('exposes the exact scene_reference/ namespace prefix', () => {
    expect(SCENE_REFERENCE_OBJECT_KEY_PREFIX).toBe('scene_reference/');
  });

  it('accepts a well-formed scene_reference key whose file_url matches the expected derived URL', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: VALID_KEY,
        fileUrl: VALID_URL,
        expectedFileUrl: VALID_URL,
      }),
    ).toBeNull();
  });

  it('rejects an object_key outside the scene_reference namespace', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: 'qc_screenshot/user_abc/2026-07-27/x.png',
        fileUrl: VALID_URL,
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('object_key_outside_scene_reference_namespace');
  });

  it('rejects an object_key containing a traversal sequence', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: 'scene_reference/../../etc/passwd',
        fileUrl: VALID_URL,
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('object_key_traversal');
  });

  it('rejects an object_key starting with a leading slash (caught by the namespace check first, since the prefix itself never starts with "/")', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: '/scene_reference/user_abc/x.png',
        fileUrl: VALID_URL,
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('object_key_outside_scene_reference_namespace');
  });

  it('rejects a traversal sequence appearing after a valid namespace prefix', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: 'scene_reference/user_abc/../../etc/passwd',
        fileUrl: VALID_URL,
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('object_key_traversal');
  });

  it('rejects a file_url that does not match the expected derived URL for the object_key', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: VALID_KEY,
        fileUrl: 'https://evil.example.com/steal.png',
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('file_url_does_not_match_object_key');
  });

  it('checks namespace before URL match, so a bad key never reports a URL-mismatch reason', () => {
    expect(
      checkSceneReferenceUpload({
        objectKey: 'qc_screenshot/user_abc/x.png',
        fileUrl: 'https://evil.example.com/steal.png',
        expectedFileUrl: VALID_URL,
      }),
    ).toBe('object_key_outside_scene_reference_namespace');
  });
});
