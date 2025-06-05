import React from "react";

interface SMPIProgressCircleProps {
    value: number; // 0-100
}

const getColor = (value: number) => {
    if (value >= 70) return "#4CAF50"; // green
    if (value >= 50) return "#2196F3"; // blue
    return "#F44336"; // red
};

const getLabel = (value: number) => {
    if (value >= 70) return "Strong Performance";
    if (value >= 50) return "Acceptable";
    return "Needs Attention";
};

export default function SMPIProgressCircle({ value }: SMPIProgressCircleProps) {
    const radius = Math.min(window.innerWidth * 0.15, 100); // Responsive radius that's at most 100
    const stroke = 16;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const percent = Math.max(0, Math.min(100, value));
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    const color = getColor(percent);
    const label = getLabel(percent);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md w-full">
            <h2 className="text-base font-medium text-gray-800 mb-2">Social Media Performance Index (SMPI)</h2>
            <div className="flex flex-col items-center justify-center w-full h-full">
                <svg height={radius * 2} width={radius * 2}>
                    <circle
                        stroke="#e5e7eb"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke={color}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s' }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dy="0.3em"
                        fontSize="2rem"
                        fill={color}
                        fontWeight="bold"
                    >
                        {percent}
                    </text>
                </svg>
                <div className="mt-2 text-lg font-semibold text-center" style={{ color }}>{label}</div>
            </div>
        </div>
    );
} 