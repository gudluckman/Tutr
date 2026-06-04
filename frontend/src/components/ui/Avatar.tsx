import { useEffect, useState } from 'react';

export function Avatar({
  name,
  src,
  className,
  imageClassName = 'h-full w-full object-cover',
  fallbackClassName = 'text-primary',
}: {
  name: string;
  src?: string | null;
  className: string;
  imageClassName?: string;
  fallbackClassName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <div className={className}>
      {src && !imageFailed ? (
        <img className={imageClassName} src={src} alt={name} onError={() => setImageFailed(true)} />
      ) : (
        <span className={fallbackClassName}>{initials(name)}</span>
      )}
    </div>
  );
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'T';
}
