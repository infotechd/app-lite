// Integration-style tests for uploadService using the real api instance (Axios)
// We don't mock the '../api' module. Instead, we override Axios adapter to intercept requests.

// Mock react-native early to avoid loading actual RN/Expo modules in Jest
const mockPlatform = { OS: 'ios', select: (obj: any) => obj['ios'] };
jest.mock('react-native', () => ({ Platform: mockPlatform }));

import api from '../api';
import { uploadFiles } from '../uploadService';

// Minimal FormData mock to capture appended entries
class MockFormData {
  public _entries: Array<{ name: string; value: any }>; // value is expected to be file-like object
  constructor() { this._entries = []; }
  append(name: string, value: any) { this._entries.push({ name, value }); }
}

// Helper to set Platform.OS dynamically
function setPlatform(os: 'android' | 'ios' | 'web') { (mockPlatform as any).OS = os; }

// Type compatible with Axios adapter
type AxiosAdapter = (config: any) => Promise<any>;

// Utility to install a one-off adapter that responds to POST /upload/files
function withMockAdapter(handler: (config: any) => any | Promise<any>) {
  const prev = (api.defaults as any).adapter as AxiosAdapter | undefined;
  (api.defaults as any).adapter = (async (config: any) => {
    // Ensure we're not doing any real network calls during tests
    if (config && config.url === '/upload/files' && (config.method ?? 'get').toLowerCase() === 'post') {
      const data = await handler(config);
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    }
    throw new Error(`Unexpected request in test: ${config?.method} ${config?.url}`);
  }) as AxiosAdapter;
  return () => { (api.defaults as any).adapter = prev; };
}

beforeEach(() => {
  // Fresh FormData mock each test
  // @ts-expect-error override for tests
  global.FormData = MockFormData as any;
  // Default to iOS unless specified
  setPlatform('ios');
});

describe('uploadService (integration)', () => {
  it('posts FormData with field name "files" and normalizes response', async () => {
    const serverFiles = [
      { fileId: '1', filename: 'a.jpg', url: '/file/1', mimetype: 'image/jpeg', size: 123 },
      { id: '2', name: 'b.mp4', url: '/file/2', mimetype: 'video/mp4', size: '456' },
      { id: '3', name: 'doc.pdf', url: '/file/3', mimetype: 'application/pdf', size: 789 },
    ];

    const restore = withMockAdapter((config) => {
      // Capture and assert FormData entries
      const form = config.data as MockFormData;
      expect(form).toBeInstanceOf(MockFormData);
      expect(form._entries).toHaveLength(2);
      for (const entry of form._entries) {
        expect(entry.name).toBe('files');
        expect(entry.value).toHaveProperty('uri');
        expect(entry.value).toHaveProperty('type');
        expect(entry.value).toHaveProperty('name');
      }
      // Return shape similar to backend controller
      return { data: { files: serverFiles } };
    });

    const media: any[] = [
      { uri: 'file:///path/a.jpg', type: 'image/jpeg', name: 'a.jpg' },
      { uri: 'file:///path/b.mp4', type: 'video/mp4', name: 'b.mp4' },
    ];

    const res = await uploadFiles(media as any);

    expect(res.images).toEqual(['/file/1']);
    expect(res.videos).toEqual(['/file/2']);
    expect(res.raw).toEqual([
      { fileId: '1', filename: 'a.jpg', url: '/file/1', mimetype: 'image/jpeg', size: 123 },
      { fileId: '2', filename: 'b.mp4', url: '/file/2', mimetype: 'video/mp4', size: 456 },
      { fileId: '3', filename: 'doc.pdf', url: '/file/3', mimetype: 'application/pdf', size: 789 },
    ]);

    restore();
  });

  it('adds file:// prefix on Android when missing', async () => {
    setPlatform('android');
    const restore = withMockAdapter((config) => {
      const form = config.data as MockFormData;
      expect(form._entries[0].value.uri).toBe('file:///storage/emulated/0/DCIM/Camera/c.jpg');
      return { data: { files: [] } };
    });

    const media: any[] = [
      { uri: '/storage/emulated/0/DCIM/Camera/c.jpg', type: 'image/jpeg', name: 'c.jpg' },
    ];

    const res = await uploadFiles(media as any);
    expect(res).toEqual({ images: [], videos: [], raw: [] });

    restore();
  });

  it('gracefully handles missing files array in response', async () => {
    const restore = withMockAdapter(() => ({ data: {} }));

    const media: any[] = [
      { uri: 'file:///z', type: 'application/octet-stream', name: undefined },
    ];

    const res = await uploadFiles(media as any);
    expect(res).toEqual({ images: [], videos: [], raw: [] });

    restore();
  });
});
