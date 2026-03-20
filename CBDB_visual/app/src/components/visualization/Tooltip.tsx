import { useTranslation } from 'react-i18next';

interface Props {
  visible: boolean;
  x: number;
  y: number;
  info: string;
  kinshipPath: string | null;
}

export function Tooltip({ visible, x, y, info, kinshipPath }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <div
      className="tooltip-box"
      style={{
        left: x + 15,
        top: y - 10,
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="tooltip-info">{info}</div>
      {kinshipPath && (
        <div className="tooltip-path">
          <strong>{t('tooltip.kinshipPath')}:</strong> {kinshipPath}
        </div>
      )}
    </div>
  );
}
