import { decode } from 'base64-arraybuffer';
import * as ImageManipulator from 'expo-image-manipulator';

export interface PreparedImage {
  arrayBuffer: ArrayBuffer;
  contentType: 'image/jpeg';
  width: number;
  height: number;
  uri: string;
}

/**
 * บีบอัดรูปภาพให้ขนาดไฟล์เบาลง (~150-250KB) แต่คงความคมชัดสูงระดับ 1080p
 * และแปลงเป็น ArrayBuffer โดยตรงเพื่ออัปโหลดขึ้น Supabase Storage
 * โดยไม่เกิดคำเตือน Response.blob() บน iOS/Android
 */
export async function compressAndPrepareImage(
  uri: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {},
): Promise<PreparedImage> {
  const { maxWidth = 1080, quality = 0.82 } = options;

  // 1. ปรับขนาดและบีบอัดด้วย Native ImageManipulator
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('failed_to_encode_image_base64');
  }

  // 2. แปลง base64 เป็น binary ArrayBuffer โดยตรง (เร็วและไม่เปลือง RAM Native)
  const arrayBuffer = decode(result.base64);

  return {
    arrayBuffer,
    contentType: 'image/jpeg',
    width: result.width,
    height: result.height,
    uri: result.uri,
  };
}
