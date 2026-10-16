import { useEffect, useRef, useState } from 'react'
import ImageViewer, { type ConversationImage } from './ImageViewer'
import { Icon } from '../desktop/Icons'

function SharedImage({ image, onOpen }: { image: ConversationImage; onOpen: () => void }) {
  const [failed, setFailed] = useState(false)
  if (image.kind === 'video') return <SharedVideo image={image} onOpen={onOpen} />
  if (!image.url || image.unavailable || failed) return <p className="mobile-image-unavailable">此图片在电脑上已不可用。</p>
  return <figure className="mobile-conversation-image"><button type="button" aria-label={`放大 ${image.name}`} onClick={onOpen}><img src={image.url} alt={image.name} loading="lazy" onError={() => setFailed(true)} /></button><figcaption>{image.name}<a href={`${image.url}?download=1`} download>下载</a></figcaption></figure>
}
function SharedVideo({ image, onOpen }: { image: ConversationImage; onOpen: () => void }) {
  if (!image.url || image.unavailable) return <p className="mobile-image-unavailable">此视频在电脑上已不可用。</p>
  return <figure className="mobile-conversation-image mobile-conversation-video"><button type="button" aria-label={`打开视频 ${image.name}`} onClick={onOpen}><Icon name="play" /> {image.name}</button><figcaption>视频<a href={`${image.url}?download=1`} download>下载</a></figcaption></figure>
}
function VideoViewer({ image, onClose }: { image: ConversationImage; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), video = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { const node = dialog.current, player = video.current; node?.showModal(); return () => { player?.pause(); node?.close() } }, [])
  return <dialog ref={dialog} className="mobile-image-viewer" aria-label="共享视频预览" onCancel={event => { event.preventDefault(); onClose() }}><header><button type="button" aria-label="关闭视频" onClick={onClose}><Icon name="close" size={24} /></button><span>{image.name}</span><a href={`${image.url}?download=1`} download>下载</a></header><div className="mobile-video-stage">{failed ? <p role="status">此视频不可用，或其格式在这部手机上不受支持。请尝试下载。</p> : <video ref={video} src={image.url} controls playsInline preload="metadata" onError={() => setFailed(true)} />}</div></dialog>
}
export default function ConversationImages({ images }: { images?: ConversationImage[] }) {
  const [selected, setSelected] = useState<ConversationImage | null>(null)
  if (!images?.length) return null
  return <div className="mobile-conversation-images">{images.map((image, index) => <SharedImage key={image.url || index} image={image} onOpen={() => setSelected(image)} />)}{selected && (selected.kind === 'video' ? <VideoViewer image={selected} onClose={() => setSelected(null)} /> : <ImageViewer image={selected} onClose={() => setSelected(null)} />)}</div>
}
