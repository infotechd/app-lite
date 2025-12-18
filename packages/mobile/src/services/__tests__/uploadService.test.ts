// Mock react-native early to avoid loading actual RN/Expo modules in Jest
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj: any) => obj.ios),
  },
}));

import { Platform } from 'react-native';
import { uploadFiles } from '../uploadService';
import type { MediaFile } from '../../utils/validation';

// Mock the api module used by uploadService (../api relative to this test file location)
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

// Access the mocked api
import api from '../api';

// Helper to set Platform.OS dynamically
function setPlatform(os: 'android' | 'ios' | 'web') {
  (Platform as any).OS = os;
  (Platform.select as jest.Mock).mockImplementation((obj: any) => obj[os]);
}

// Minimal FormData mock to capture appended entries
class MockFormData {
  public _entries: Array<{ name: string; value: any }>; // value is expected to be file-like object
  constructor() {
    this._entries = [];
  }
  append(name: string, value: any) {
    this._entries.push({ name, value });
  }
}

// Attach the mock FormData to global before tests
beforeEach(() => {
  // Reset api mock
  (api.post as jest.Mock).mockReset();
  // Install fresh FormData mock
  
  global.FormData = MockFormData as any;
  // Default to ios unless specified by a test
  setPlatform('ios');
});

describe('uploadService.uploadFiles', () => {
  it('returns empty arrays when input is empty', async () => {
    const res = await uploadFiles([]);
    expect(res).toEqual({ images: [], videos: [], raw: [] });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('returns empty arrays when input is not an array', async () => {
    
    const res = await uploadFiles(undefined);
    expect(res).toEqual({ images: [], videos: [], raw: [] });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('appends each file under field name "files" and preserves name/type on iOS', async () => {
    setPlatform('ios');
    // Arrange response
    ;(api.post as jest.Mock).mockResolvedValue({ data: { data: { files: [] } } });

    const media: MediaFile[] = [
      { uri: 'file:///path/a.jpg', type: 'image/jpeg', name: 'a.jpg' } as any,
      { uri: 'file:///path/b.mp4', type: 'video/mp4', name: 'b.mp4' } as any,
    ];

    // Act
    const res = await uploadFiles(media);

    expect(res).toEqual({ images: [], videos: [], raw: [] });

    // Assert FormData content
    const formArg = (api.post as jest.Mock).mock.calls[0][1] as unknown as MockFormData;
    expect(formArg).toBeInstanceOf(MockFormData);
    expect(formArg._entries).toHaveLength(2);
    for (const entry of formArg._entries) {
      expect(entry.name).toBe('files');
      expect(entry.value).toHaveProperty('uri');
      expect(entry.value).toHaveProperty('type');
      expect(entry.value).toHaveProperty('name');
    }
    expect(formArg._entries[0].value).toMatchObject({ uri: 'file:///path/a.jpg', type: 'image/jpeg', name: 'a.jpg' });
    expect(formArg._entries[1].value).toMatchObject({ uri: 'file:///path/b.mp4', type: 'video/mp4', name: 'b.mp4' });

    // Assert API call (with multipart headers overriding default json)
    expect(api.post).toHaveBeenCalledWith(
      '/upload/files',
      expect.any(Object),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' }) })
    );
  });

  it('on Android, adds file:// prefix if missing', async () => {
    setPlatform('android');
    ;(api.post as jest.Mock).mockResolvedValue({ data: { data: { files: [] } } });

    const media: MediaFile[] = [
      { uri: '/storage/emulated/0/DCIM/Camera/c.jpg', type: 'image/jpeg', name: 'c.jpg' } as any,
    ];

    await uploadFiles(media);

    const formArg = (api.post as jest.Mock).mock.calls[0][1] as unknown as MockFormData;
    expect(formArg._entries[0].value.uri).toBe('file:///storage/emulated/0/DCIM/Camera/c.jpg');
  });

  it('normalizes response from data.data.files and filters images/videos', async () => {
    setPlatform('ios');
    const serverFiles = [
      { fileId: '1', filename: 'a.jpg', url: '/file/1', mimetype: 'image/jpeg', size: 123 },
      { id: '2', name: 'b.mp4', url: '/file/2', mimetype: 'video/mp4', size: '456' },
      { id: '3', name: 'doc.pdf', url: '/file/3', mimetype: 'application/pdf', size: 789 },
    ];
    ;(api.post as jest.Mock).mockResolvedValue({ data: { data: { files: serverFiles } } });

    const media: MediaFile[] = [
      { uri: 'file:///x', type: 'image/jpeg', name: 'x.jpg' } as any,
    ];

    const res = await uploadFiles(media);

    expect(res.images).toEqual(['/file/1']);
    expect(res.videos).toEqual(['/file/2']);
    expect(res.raw).toEqual([
      { fileId: '1', filename: 'a.jpg', url: '/file/1', mimetype: 'image/jpeg', size: 123 },
      { fileId: '2', filename: 'b.mp4', url: '/file/2', mimetype: 'video/mp4', size: 456 },
      { fileId: '3', filename: 'doc.pdf', url: '/file/3', mimetype: 'application/pdf', size: 789 },
    ]);
  });

  it('normalizes response when files are at root (data.files missing)', async () => {
    const serverFiles = [
      { id: 10, name: 'z.jpg', url: '/f/10', mimetype: 'image/png', size: 1 },
    ];
    ;(api.post as jest.Mock).mockResolvedValue({ data: { files: serverFiles } });

    const media: MediaFile[] = [
      { uri: 'file:///y', type: 'image/png', name: 'y.png' } as any,
    ];

    const res = await uploadFiles(media);

    expect(res.images).toEqual(['/f/10']);
    expect(res.videos).toEqual([]);
    expect(res.raw).toEqual([
      { fileId: '10', filename: 'z.jpg', url: '/f/10', mimetype: 'image/png', size: 1 },
    ]);
  });

  it('handles missing response fields gracefully', async () => {
    ;(api.post as jest.Mock).mockResolvedValue({ data: {} });

    const media: MediaFile[] = [
      { uri: 'file:///z', type: 'application/octet-stream', name: undefined as any } as any,
    ];

    const res = await uploadFiles(media);

    expect(res).toEqual({ images: [], videos: [], raw: [] });
  });
});
