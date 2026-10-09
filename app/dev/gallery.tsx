import { useState } from 'react';
import { Text, View } from 'react-native';
import { AddFab } from '@/components/AddFab';
import { Amount } from '@/components/Amount';
import { AmountKeypad } from '@/components/AmountKeypad';
import { BackButton } from '@/components/BackButton';
import { CallingCard } from '@/components/CallingCard';
import { JaggedProgress } from '@/components/JaggedProgress';
import { PlaceholderRows } from '@/components/PlaceholderRows';
import { RansomText } from '@/components/RansomText';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SkewButton } from '@/components/SkewButton';
import { SkewChip } from '@/components/SkewChip';
import { SkewRow } from '@/components/SkewRow';
import { SkewToggle } from '@/components/SkewToggle';
import { SlamSheet } from '@/components/SlamSheet';
import { SlantPanel } from '@/components/SlantPanel';
import { TextField } from '@/components/TextField';
import { formatAmountInput, pressKey } from '@/features/transactions/amount-input';
import { colors, fonts, typeScale } from '@/theme/tokens';

const SPENT_STEPS = [2700, 5100, 6000, 7400];

function Section({ name }: { name: string }) {
  return (
    <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.caption, color: colors.ash, marginTop: 28, marginBottom: 10 }}>
      {name}
    </Text>
  );
}

/** Galería de componentes para revisar el estilo en el celular. Solo existe en desarrollo. */
export default function GalleryScreen() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [card, setCard] = useState<'blood' | 'signal' | null>(null);
  const [field, setField] = useState('');
  const [amount, setAmount] = useState('');
  const [jagged, setJagged] = useState(false);
  const [chip, setChip] = useState(0);
  const [typed, setTyped] = useState('');
  const [toggle, setToggle] = useState(true);
  return (
    <Screen title="GALERÍA" backdrop={2}>
      <BackButton />

      <Section name="Nota de rescate" />
      <RansomText text="ESTA SEMANA" />
      <View style={{ height: 12 }} />
      <RansomText text="ÚLTIMOS MOVIMIENTOS" size="sm" />

      <Section name="Montos" />
      <Amount value={4275.72} currency="DOP" size="hero" />
      <Amount value={12} currency="USD" />
      <Amount value={-434.22} currency="DOP" tone="ash" />

      <Section name="Barra de presupuesto (usa el botón para cambiar el estado)" />
      <JaggedProgress spent={SPENT_STEPS[step]} limit={6000} currency="DOP" />
      <View style={{ height: 12 }} />
      <SkewButton label="Siguiente estado" variant="ghost" onPress={() => setStep((s) => (s + 1) % SPENT_STEPS.length)} />

      <Section name="Tiras de lista" />
      {['UBER*RIDES', 'SUPERMERCADO NACIONAL', 'NETFLIX.COM'].map((title, i) => (
        <SkewRow
          key={title}
          title={title}
          subtitle={i === 2 ? 'Entretenimiento' : 'Sin categoría'}
          amount={i === 2 ? { value: 12, currency: 'USD' } : { value: i === 0 ? 275.72 : 2140, currency: 'DOP' }}
          selected={selected === i}
          onPress={() => setSelected(i)}
        />
      ))}

      <Section name="Paneles (usa el botón para alternar el estilo)" />
      <SlantPanel key={jagged ? 'jagged' : 'slanted'} color="blood" jagged={jagged}>
        <Text style={{ fontFamily: fonts.bodyStrong, fontSize: typeScale.body, color: colors.paper }}>
          {jagged ? 'Panel dentado' : 'Panel inclinado'}
        </Text>
      </SlantPanel>
      <View style={{ height: 12 }} />
      <SkewButton
        label={jagged ? 'Ver inclinado' : 'Ver dentado'}
        variant="ghost"
        onPress={() => setJagged((j) => !j)}
      />

      <Section name="Campo de texto" />
      <TextField label="Comercio" value={field} onChangeText={setField} />

      <Section name="Chips" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['Hoy', 'Ayer', 'Otro día'].map((label, i) => (
          <SkewChip key={label} label={label} selected={chip === i} onPress={() => setChip(i)} />
        ))}
      </View>

      <Section name="Encabezado de grupo" />
      <SectionHeader title="AVISOS DE PRESUPUESTO" />

      <Section name="Interruptores" />
      <SkewToggle label="Aviso al 80 %" value={toggle} onChange={setToggle} />
      <SkewToggle label="Desactivado" value={false} onChange={() => undefined} disabled />

      <Section name="Teclado de montos" />
      <Text style={{ fontFamily: fonts.amount, fontSize: typeScale.amountHero, color: colors.paper, fontVariant: ['tabular-nums'] }}>
        {formatAmountInput(typed, 'DOP')}
      </Text>
      <AmountKeypad onKey={(key) => setTyped((current) => pressKey(current, key))} />

      <Section name="Cargando" />
      <PlaceholderRows />

      <Section name="Botón agregar" />
      <View style={{ height: 72 }}>
        <AddFab onPress={() => setSheet(true)} />
      </View>

      <Section name="Botones" />
      <SkewButton label="Agregar gasto" onPress={() => setSheet(true)} />
      <View style={{ height: 12 }} />
      <SkewButton label="Guardar (sin monto)" disabled onPress={() => undefined} />
      <View style={{ height: 12 }} />
      <SkewButton label="Aviso al 80 %" variant="ghost" onPress={() => setCard('signal')} />
      <View style={{ height: 12 }} />
      <SkewButton label="Aviso al 100 %" variant="ghost" onPress={() => setCard('blood')} />

      {card ? (
        <View style={{ marginTop: 24 }}>
          <CallingCard
            tone={card}
            title={card === 'signal' ? 'CUIDADO' : 'TE PASASTE'}
            message={
              card === 'signal'
                ? 'Llevas el 85 % de tu presupuesto semanal.'
                : 'Gastaste RD$ 7,400.00 de RD$ 6,000.00 esta semana.'
            }
            onDismiss={() => setCard(null)}
          />
        </View>
      ) : null}

      <SlamSheet visible={sheet} onClose={() => setSheet(false)} title="NUEVO GASTO">
        <TextField label="Monto" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <SkewButton label="Guardar" onPress={() => setSheet(false)} />
      </SlamSheet>
    </Screen>
  );
}
