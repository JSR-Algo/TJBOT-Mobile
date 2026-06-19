import fs from 'fs';
import path from 'path';

const iconDir = path.join(__dirname, '..', '..', 'ios', 'TJBotMobile', 'Images.xcassets', 'AppIcon.appiconset');
const contentsPath = path.join(iconDir, 'Contents.json');

function pngSize(filePath: string): {width: number; height: number} {
  const data = fs.readFileSync(filePath);
  if (data.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${path.basename(filePath)} is not a PNG`);
  }
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  };
}

function expectedPixels(size: string, scale: string): number {
  const points = Number(size.split('x')[0]);
  const multiplier = Number(scale.replace('x', ''));
  return points * multiplier;
}

const requiredIPadAppStoreIcons = [
  {idiom: 'ipad', scale: '2x', size: '76x76'},
  {idiom: 'ipad', scale: '2x', size: '83.5x83.5'},
];

describe('iOS app icon asset catalog', () => {
  it('references existing PNG files at the required dimensions', () => {
    const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf8')) as {
      images: Array<{filename?: string; idiom: string; scale: string; size: string}>;
    };

    for (const requiredIcon of requiredIPadAppStoreIcons) {
      expect(contents.images).toEqual(expect.arrayContaining([expect.objectContaining(requiredIcon)]));
    }
    expect(contents.images.length).toBeGreaterThanOrEqual(1);

    for (const image of contents.images) {
      expect(image.filename).toBeTruthy();
      const filename = image.filename as string;
      const filePath = path.join(iconDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);

      const expected = expectedPixels(image.size, image.scale);
      expect(pngSize(filePath)).toEqual({width: expected, height: expected});
    }
  });
});
