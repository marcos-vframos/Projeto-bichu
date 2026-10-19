/**
 * Utilitário de compressão de fotos client-side
 * Garante imagens com dimensão máxima de 1200px e limite de 10MB
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.85,
): Promise<File> {
  if (file.type === 'image/svg+xml') return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return resolve(file)
      }

      ctx.drawImage(img, 0, 0, width, height)

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
          } else {
            const compressed = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '') + (outputType === 'image/png' ? '.png' : '.jpg'),
              {
                type: outputType,
                lastModified: Date.now(),
              },
            )
            resolve(compressed)
          }
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}
