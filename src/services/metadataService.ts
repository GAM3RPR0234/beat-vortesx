import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Track } from '@/store/playerStore';

interface ID3TagData {
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  trackNumber?: number;
  totalTracks?: number;
  artwork?: string; // base64 or uri
  // ReplayGain tags
  replayGainTrackGain?: number;
  replayGainTrackPeak?: number;
  replayGainAlbumGain?: number;
  replayGainAlbumPeak?: number;
}

const ID3_HEADER_SIZE = 10;

const encodeUTF16 = (str: string): Uint8Array => {
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(str);
  const utf16 = new Uint8Array(2 + utf8.length * 2);
  utf16[0] = 0xFF;
  utf16[1] = 0xFE;
  for (let i = 0; i < utf8.length; i++) {
    utf16[2 + i * 2] = utf8[i];
    utf16[3 + i * 2] = 0;
  }
  return utf16;
};

const encodeSynchsafe = (num: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  bytes[0] = (num >> 21) & 0x7F;
  bytes[1] = (num >> 14) & 0x7F;
  bytes[2] = (num >> 7) & 0x7F;
  bytes[3] = num & 0x7F;
  return bytes;
};

const createFrame = (id: string, data: Uint8Array): Uint8Array => {
  const frameHeader = new Uint8Array(10);
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(id);
  frameHeader.set(idBytes);
  const sizeBytes = encodeSynchsafe(data.length);
  frameHeader.set(sizeBytes, 4);
  const frame = new Uint8Array(10 + data.length);
  frame.set(frameHeader);
  frame.set(data, 10);
  return frame;
};

const createTextFrame = (id: string, text: string): Uint8Array => {
  const encoding = new Uint8Array([0x01]); // UTF-16
  const textData = encodeUTF16(text);
  const data = new Uint8Array(encoding.length + textData.length);
  data.set(encoding);
  data.set(textData, encoding.length);
  return createFrame(id, data);
};

const createTXXXFrame = (description: string, value: string): Uint8Array => {
  const encoding = new Uint8Array([0x01]); // UTF-16
  const encoder = new TextEncoder();
  const descData = encoder.encode(description + '\0');
  const valueData = encodeUTF16(value);
  const data = new Uint8Array(encoding.length + descData.length + valueData.length);
  data.set(encoding, 0);
  data.set(descData, encoding.length);
  data.set(valueData, encoding.length + descData.length);
  return createFrame('TXXX', data);
};

const createAPICFrame = async (artworkUri: string): Promise<Uint8Array | null> => {
  try {
    let imageData: Uint8Array;

    if (artworkUri.startsWith('http')) {
      const response = await fetch(artworkUri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      imageData = new Uint8Array(arrayBuffer);
    } else {
      const base64 = await FileSystem.readAsStringAsync(artworkUri, { encoding: FileSystem.EncodingType.Base64 });
      const binary = atob(base64);
      imageData = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        imageData[i] = binary.charCodeAt(i);
      }
    }

    const mimeType = imageData[0] === 0xFF ? 'image/jpeg' : 'image/png';
    const encoder = new TextEncoder();
    const mimeBytes = encoder.encode(mimeType + '\0');
    const desc = encoder.encode('\0');
    const encoding = new Uint8Array([0x00]); // ISO-8859-1

    const data = new Uint8Array(encoding.length + mimeBytes.length + desc.length + imageData.length);
    let offset = 0;
    data.set(encoding, offset); offset += encoding.length;
    data.set(mimeBytes, offset); offset += mimeBytes.length;
    data.set(desc, offset); offset += desc.length;
    data.set(imageData, offset);

    return createFrame('APIC', data);
  } catch (error) {
    console.warn('Failed to create APIC frame:', error);
    return null;
  }
};

export const writeMetadataToFile = async (fileUri: string, track: Track): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      console.error('File does not exist:', fileUri);
      return false;
    }

    const frames: Uint8Array[] = [];

    // TIT2 - Title
    frames.push(createTextFrame('TIT2', track.title));

    // TPE1 - Artist
    frames.push(createTextFrame('TPE1', track.artist));

    // TALB - Album
    frames.push(createTextFrame('TALB', track.album));

    // TDRC - Year
    if (track.year) {
      frames.push(createTextFrame('TDRC', track.year.toString()));
    }

    // TCON - Genre
    if (track.genre) {
      frames.push(createTextFrame('TCON', track.genre));
    }

    // ReplayGain - Track Gain (TXXX:replaygain_track_gain)
    if (track.replayGainTrackGain !== undefined) {
      frames.push(createTXXXFrame('replaygain_track_gain', track.replayGainTrackGain.toFixed(2) + ' dB'));
    }

    // ReplayGain - Track Peak (TXXX:replaygain_track_peak)
    if (track.replayGainTrackPeak !== undefined) {
      frames.push(createTXXXFrame('replaygain_track_peak', track.replayGainTrackPeak.toFixed(6)));
    }

    // ReplayGain - Album Gain (TXXX:replaygain_album_gain)
    if (track.replayGainAlbumGain !== undefined) {
      frames.push(createTXXXFrame('replaygain_album_gain', track.replayGainAlbumGain.toFixed(2) + ' dB'));
    }

    // ReplayGain - Album Peak (TXXX:replaygain_album_peak)
    if (track.replayGainAlbumPeak !== undefined) {
      frames.push(createTXXXFrame('replaygain_album_peak', track.replayGainAlbumPeak.toFixed(6)));
    }

    // TRCK - Track Number
    if (track.trackNumber) {
      const trackStr = track.totalTracks
        ? `${track.trackNumber}/${track.totalTracks}`
        : track.trackNumber.toString();
      frames.push(createTextFrame('TRCK', trackStr));
    }

    // APIC - Cover Art
    if (track.artwork) {
      const apicFrame = await createAPICFrame(track.artwork);
      if (apicFrame) {
        frames.push(apicFrame);
      }
    }

    // Calculate total tag size
    let tagSize = 0;
    frames.forEach(frame => tagSize += frame.length);

    // Create ID3v2 header
    const header = new Uint8Array(ID3_HEADER_SIZE);
    const encoder = new TextEncoder();
    header.set(encoder.encode('ID3'));
    header[3] = 0x04; // Version 2.4
    header[4] = 0x00;
    header[5] = 0x00; // Flags
    header.set(encodeSynchsafe(tagSize), 6);

    // Combine all frames
    const tagData = new Uint8Array(ID3_HEADER_SIZE + tagSize);
    tagData.set(header);
    let offset = ID3_HEADER_SIZE;
    frames.forEach(frame => {
      tagData.set(frame, offset);
      offset += frame.length;
    });

    // Read original file
    const originalBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    const originalBinary = atob(originalBase64);
    const originalData = new Uint8Array(originalBinary.length);
    for (let i = 0; i < originalBinary.length; i++) {
      originalData[i] = originalBinary.charCodeAt(i);
    }

    // Check if file already has ID3 tag
    let startOffset = 0;
    if (originalData.length >= 10) {
      const id3Check = String.fromCharCode(originalData[0], originalData[1], originalData[2]);
      if (id3Check === 'ID3') {
        // Skip existing tag
        const existingTagSize =
          ((originalData[6] & 0x7F) << 21) |
          ((originalData[7] & 0x7F) << 14) |
          ((originalData[8] & 0x7F) << 7) |
          (originalData[9] & 0x7F);
        startOffset = 10 + existingTagSize;
      }
    }

    // Combine new tag + audio data
    const audioData = originalData.slice(startOffset);
    const finalData = new Uint8Array(tagData.length + audioData.length);
    finalData.set(tagData);
    finalData.set(audioData, tagData.length);

    // Write back to file
    const finalBase64 = btoa(String.fromCharCode(...finalData));
    await FileSystem.writeAsStringAsync(fileUri, finalBase64, { encoding: FileSystem.EncodingType.Base64 });

    return true;
  } catch (error) {
    console.error('Failed to write metadata:', error);
    return false;
  }
};

export const readMetadataFromFile = async (fileUri: string): Promise<Partial<ID3TagData> | null> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      data[i] = binary.charCodeAt(i);
    }

    if (data.length < 10) return null;

    // Check for ID3 tag
    const id3Check = String.fromCharCode(data[0], data[1], data[2]);
    if (id3Check !== 'ID3') return null;

    const tagSize =
      ((data[6] & 0x7F) << 21) |
      ((data[7] & 0x7F) << 14) |
      ((data[8] & 0x7F) << 7) |
      (data[9] & 0x7F);

    let offset = 10;
    const endOffset = 10 + tagSize;
    const result: Partial<ID3TagData> = {};

    while (offset < endOffset && offset + 10 <= data.length) {
      const frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
      if (frameId === '\0\0\0\0') break;

      const frameSize =
        ((data[offset + 4] & 0x7F) << 21) |
        ((data[offset + 5] & 0x7F) << 14) |
        ((data[offset + 6] & 0x7F) << 7) |
        (data[offset + 7] & 0x7F);

      const frameData = data.slice(offset + 10, offset + 10 + frameSize);

      if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB' || frameId === 'TDRC' || frameId === 'TCON' || frameId === 'TRCK') {
        const text = decodeTextFrame(frameData);
        switch (frameId) {
          case 'TIT2': result.title = text; break;
          case 'TPE1': result.artist = text; break;
          case 'TALB': result.album = text; break;
          case 'TDRC': result.year = parseInt(text, 10); break;
          case 'TCON': result.genre = text; break;
          case 'TRCK': {
            const parts = text.split('/');
            result.trackNumber = parseInt(parts[0], 10);
            if (parts[1]) result.totalTracks = parseInt(parts[1], 10);
            break;
          }
        }
      } else if (frameId === 'TXXX') {
        // ReplayGain TXXX frames
        const text = decodeTextFrame(frameData);
        const nullIndex = text.indexOf('\0');
        if (nullIndex > 0) {
          const description = text.substring(0, nullIndex);
          const value = text.substring(nullIndex + 1);
          switch (description) {
            case 'replaygain_track_gain':
              result.replayGainTrackGain = parseFloat(value.replace(' dB', ''));
              break;
            case 'replaygain_track_peak':
              result.replayGainTrackPeak = parseFloat(value);
              break;
            case 'replaygain_album_gain':
              result.replayGainAlbumGain = parseFloat(value.replace(' dB', ''));
              break;
            case 'replaygain_album_peak':
              result.replayGainAlbumPeak = parseFloat(value);
              break;
          }
        }
      } else if (frameId === 'APIC') {
        // Extract artwork
        const mimeEnd = frameData.indexOf(0);
        if (mimeEnd > 0) {
          const mimeType = String.fromCharCode(...frameData.slice(0, mimeEnd));
          const imageData = frameData.slice(mimeEnd + 2); // skip encoding + mime + null
          const base64Image = btoa(String.fromCharCode(...imageData));
          result.artwork = `data:${mimeType};base64,${base64Image}`;
        }
      }

      offset += 10 + frameSize;
    }

    return result;
  } catch (error) {
    console.error('Failed to read metadata:', error);
    return null;
  }
};

const decodeTextFrame = (data: Uint8Array): string => {
  if (data.length === 0) return '';
  const encoding = data[0];
  const textData = data.slice(1);

  if (encoding === 0x01) {
    // UTF-16
    const decoder = new TextDecoder('utf-16');
    return decoder.decode(textData).replace(/\0/g, '');
  } else if (encoding === 0x02) {
    // UTF-16BE
    const decoder = new TextDecoder('utf-16be');
    return decoder.decode(textData).replace(/\0/g, '');
  } else if (encoding === 0x03) {
    // UTF-8
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(textData).replace(/\0/g, '');
  } else {
    // ISO-8859-1
    return String.fromCharCode(...textData).replace(/\0/g, '');
  }
};

export const extractEmbeddedArtwork = async (fileUri: string): Promise<string | null> => {
  const metadata = await readMetadataFromFile(fileUri);
  return metadata?.artwork || null;
};