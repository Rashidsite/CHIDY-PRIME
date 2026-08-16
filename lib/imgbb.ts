export async function uploadToImgBB(fileOrBase64: File | string): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY || '8582f7063f886019d56dc673b2c19097';
  const formData = new FormData();

  if (typeof fileOrBase64 === 'string') {
    // Strip data header if present
    const base64Data = fileOrBase64.replace(/^data:image\/\w+;base64,/, '');
    formData.append('image', base64Data);
  } else {
    formData.append('image', fileOrBase64);
  }

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json?.error?.message || 'Failed to upload image to ImgBB');
  }

  return json.data.url;
}
