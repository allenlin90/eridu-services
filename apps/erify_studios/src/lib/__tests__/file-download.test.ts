import { beforeEach, describe, expect, it, vi } from 'vitest';

import { triggerBrowserDownload } from '../file-download';

describe('triggerBrowserDownload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a download link, clicks it, and revokes the object URL', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a');
    anchor.click = clickSpy;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    triggerBrowserDownload({ content: 'hello', mimeType: 'text/plain', filename: 'note.txt' });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(anchor.getAttribute('download')).toBe('note.txt');
    expect(anchor.href).toContain('blob:mock-url');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(document.body.contains(anchor)).toBe(false);
  });

  it('revokes the object URL even when the click path throws', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-throw');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement('a');
    anchor.click = vi.fn(() => {
      throw new Error('click blocked');
    });
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    expect(() => triggerBrowserDownload({
      content: 'x',
      mimeType: 'text/plain',
      filename: 'x.txt',
    })).toThrow('click blocked');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-throw');
  });
});
