import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export interface ZonosVoiceSettingsValue {
    speed: number;
    emotion: {
        happiness: number;
        sadness: number;
        disgust: number;
        fear: number;
        surprise: number;
        anger: number;
        other: number;
        neutral: number;
    };
}

export const ZONOS_VOICE_SETTINGS_DEFAULTS: ZonosVoiceSettingsValue = {
    speed: 1.0,
    emotion: {
        happiness: 1.0,
        sadness: 0.05,
        disgust: 0.05,
        fear: 0.05,
        surprise: 0.05,
        anger: 0.05,
        other: 0.1,
        neutral: 0.2,
    },
};

const EMOTION_LABELS: Record<keyof ZonosVoiceSettingsValue['emotion'], string> = {
    happiness: 'Happiness',
    sadness: 'Sadness',
    disgust: 'Disgust',
    fear: 'Fear',
    surprise: 'Surprise',
    anger: 'Anger',
    other: 'Other',
    neutral: 'Neutral',
};

interface Props {
    value: ZonosVoiceSettingsValue;
    onChange: (v: ZonosVoiceSettingsValue) => void;
    disabled?: boolean;
}

function SliderRow({
    label,
    value,
    min,
    max,
    step,
    onChange,
    disabled,
    unit = '',
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    disabled: boolean;
    unit?: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{label}</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {value.toFixed(2)}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full accent-primary disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

export function ZonosVoiceSettings({ value, onChange, disabled = false }: Props) {
    const [open, setOpen] = useState(false);

    const setSpeed = (speed: number) => onChange({ ...value, speed });

    const setEmotion = (key: keyof ZonosVoiceSettingsValue['emotion'], val: number) =>
        onChange({ ...value, emotion: { ...value.emotion, [key]: val } });

    return (
        <Card>
            <CardHeader
                className="cursor-pointer select-none pb-3"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Voice Settings</CardTitle>
                    {open ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
                {!open && (
                    <p className="text-xs text-muted-foreground">
                        Speed: {value.speed.toFixed(1)}× · Happiness: {value.emotion.happiness.toFixed(2)}
                    </p>
                )}
            </CardHeader>

            {open && (
                <CardContent className="flex flex-col gap-5 pt-0">
                    {/* Speed */}
                    <SliderRow
                        label="Speed"
                        value={value.speed}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        onChange={setSpeed}
                        disabled={disabled}
                        unit="×"
                    />

                    {/* Emotion sliders */}
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Emotion</p>
                        <p className="text-xs text-muted-foreground mb-3">
                            Adjust the emotional tone of the generated speech. Values are relative weights (0–1).
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {(Object.keys(EMOTION_LABELS) as Array<keyof typeof EMOTION_LABELS>).map((key) => (
                                <SliderRow
                                    key={key}
                                    label={EMOTION_LABELS[key]}
                                    value={value.emotion[key]}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    onChange={(v) => setEmotion(key, v)}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
