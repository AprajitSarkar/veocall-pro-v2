import { motion, useSpring, useTransform, MotionValue } from 'motion/react';
import { useEffect } from 'react';
import './Counter.css';

interface NumberProps {
    mv: MotionValue<number>;
    number: number;
    height: number;
}

function Number({ mv, number, height }: NumberProps) {
    let y = useTransform(mv, latest => {
        let placeValue = latest % 10;
        let offset = (10 + number - placeValue) % 10;
        let memo = offset * height;
        if (offset > 5) {
            memo -= 10 * height;
        }
        return memo;
    });
    return (
        <motion.span className="counter-number" style={{ y }}>
            {number}
        </motion.span>
    );
}

interface DigitProps {
    place: number | string;
    value: number;
    height: number;
    digitStyle?: React.CSSProperties;
}

function Digit({ place, value, height, digitStyle }: DigitProps) {
    const isDecimal = place === '.';
    // Calculate rounded value for this place.
    // If places are powers of 10, value / place gives the digit at that place + lower digits.
    // e.g. value=25, place=10. 25/10 = 2.5. Floor = 2.
    // e.g. value=25, place=1. 25/1 = 25. Floor = 25.
    // The spring animates this value.
    const placeVal = typeof place === 'number' ? place : 1;
    const valueRoundedToPlace = isDecimal ? 0 : Math.floor(value / placeVal);
    const animatedValue = useSpring(valueRoundedToPlace, { damping: 20, stiffness: 200 }); // Added spring config for smoothness

    useEffect(() => {
        if (!isDecimal) {
            animatedValue.set(valueRoundedToPlace);
        }
    }, [animatedValue, valueRoundedToPlace, isDecimal]);

    if (isDecimal) {
        return (
            <span className="counter-digit" style={{ height, ...digitStyle, width: 'fit-content' }}>
                .
            </span>
        );
    }

    return (
        <span className="counter-digit" style={{ height, ...digitStyle }}>
            {Array.from({ length: 10 }, (_, i) => (
                <Number key={i} mv={animatedValue} number={i} height={height} />
            ))}
        </span>
    );
}

interface CounterProps {
    value: number;
    fontSize?: number;
    padding?: number;
    places?: (number | string)[];
    gap?: number;
    borderRadius?: number;
    horizontalPadding?: number;
    textColor?: string;
    fontWeight?: string | number;
    containerStyle?: React.CSSProperties;
    counterStyle?: React.CSSProperties;
    digitStyle?: React.CSSProperties;
    gradientHeight?: number;
    gradientFrom?: string;
    gradientTo?: string;
    topGradientStyle?: React.CSSProperties;
    bottomGradientStyle?: React.CSSProperties;
}

export default function Counter({
    value,
    fontSize = 100,
    padding = 0,
    places,
    gap = 8,
    borderRadius = 4,
    horizontalPadding = 8,
    textColor = 'inherit',
    fontWeight = 'inherit',
    containerStyle,
    counterStyle,
    digitStyle,
    gradientHeight = 16,
    gradientFrom = 'black',
    gradientTo = 'transparent',
    topGradientStyle,
    bottomGradientStyle
}: CounterProps) {
    const height = fontSize + padding;

    // Default places calculation if not provided (adapted from user code)
    const effectivePlaces = places ?? [...value.toString()].map((ch, i, a) => {
        if (ch === '.') {
            return '.';
        } else {
            return (
                10 **
                (a.indexOf('.') === -1 ? a.length - i - 1 : i < a.indexOf('.') ? a.indexOf('.') - i - 1 : -(i - a.indexOf('.')))
            );
        }
    });

    const defaultCounterStyle: React.CSSProperties = {
        fontSize,
        gap: gap,
        borderRadius: borderRadius,
        paddingLeft: horizontalPadding,
        paddingRight: horizontalPadding,
        color: textColor,
        fontWeight: fontWeight
    };
    const defaultTopGradientStyle: React.CSSProperties = {
        height: gradientHeight,
        background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`
    };
    const defaultBottomGradientStyle: React.CSSProperties = {
        height: gradientHeight,
        background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`
    };
    return (
        <span className="counter-container" style={containerStyle}>
            <span className="counter-counter" style={{ ...defaultCounterStyle, ...counterStyle }}>
                {effectivePlaces.map((place, i) => (
                    <Digit key={i} place={place} value={value} height={height} digitStyle={digitStyle} />
                ))}
            </span>
            <span className="gradient-container">
                <span className="top-gradient" style={topGradientStyle ? topGradientStyle : defaultTopGradientStyle}></span>
                <span
                    className="bottom-gradient"
                    style={bottomGradientStyle ? bottomGradientStyle : defaultBottomGradientStyle}
                ></span>
            </span>
        </span>
    );
}
