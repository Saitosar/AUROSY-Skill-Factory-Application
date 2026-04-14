import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

interface YouTubeUrlInputProps {
  onSubmit: (url: string, options?: { startSec?: number; endSec?: number }) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function YouTubeUrlInput({ onSubmit, isLoading, disabled }: YouTubeUrlInputProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [showTrim, setShowTrim] = useState(false);
  const [startSec, setStartSec] = useState<string>("");
  const [endSec, setEndSec] = useState<string>("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!url.trim()) return;

      const options: { startSec?: number; endSec?: number } = {};
      if (startSec.trim()) {
        const parsed = parseFloat(startSec);
        if (!isNaN(parsed) && parsed >= 0) options.startSec = parsed;
      }
      if (endSec.trim()) {
        const parsed = parseFloat(endSec);
        if (!isNaN(parsed) && parsed > 0) options.endSec = parsed;
      }

      onSubmit(url.trim(), options);
    },
    [url, startSec, endSec, onSubmit]
  );

  const isValidYouTubeUrl = useCallback((input: string) => {
    const patterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /youtube\.com\/embed\//,
      /youtube\.com\/shorts\//,
    ];
    return patterns.some((p) => p.test(input));
  }, []);

  const urlValid = url.trim() && isValidYouTubeUrl(url);

  return (
    <form onSubmit={handleSubmit} className="youtube-url-input">
      <div className="youtube-url-input__main">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("video.urlPlaceholder", "Paste YouTube URL...")}
          disabled={disabled || isLoading}
          className="youtube-url-input__field"
          aria-label={t("video.urlLabel", "YouTube video URL")}
        />
        <button
          type="submit"
          disabled={disabled || isLoading || !urlValid}
          className="youtube-url-input__btn"
        >
          {isLoading ? t("video.loading", "Loading...") : t("video.loadVideo", "Load Video")}
        </button>
      </div>

      <div className="youtube-url-input__options">
        <label className="youtube-url-input__toggle">
          <input
            type="checkbox"
            checked={showTrim}
            onChange={(e) => setShowTrim(e.target.checked)}
            disabled={disabled || isLoading}
          />
          <span>{t("video.trimOptions", "Trim options")}</span>
        </label>

        {showTrim && (
          <div className="youtube-url-input__trim">
            <label>
              <span>{t("video.startSec", "Start (sec)")}</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={startSec}
                onChange={(e) => setStartSec(e.target.value)}
                disabled={disabled || isLoading}
                placeholder="0"
              />
            </label>
            <label>
              <span>{t("video.endSec", "End (sec)")}</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={endSec}
                onChange={(e) => setEndSec(e.target.value)}
                disabled={disabled || isLoading}
                placeholder="60"
              />
            </label>
          </div>
        )}
      </div>

      {url.trim() && !urlValid && (
        <p className="youtube-url-input__hint muted">
          {t("video.invalidUrl", "Enter a valid YouTube URL")}
        </p>
      )}
    </form>
  );
}
