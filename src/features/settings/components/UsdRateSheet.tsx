import { SlamSheet } from '@/components/SlamSheet';
import { UsdRateForm } from './UsdRateForm';

interface Props {
  visible: boolean;
  rate: number;
  onClose: () => void;
}

export function UsdRateSheet({ visible, rate, onClose }: Props) {
  return (
    <SlamSheet visible={visible} onClose={onClose} title="TASA DEL DÓLAR">
      <UsdRateForm rate={rate} onDone={onClose} />
    </SlamSheet>
  );
}
