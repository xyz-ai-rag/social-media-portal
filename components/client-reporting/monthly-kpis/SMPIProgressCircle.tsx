"use client"
import React, { useEffect, useRef, useState } from "react";
import { calculateSMPI, getSMPILabel, getSMPIColor } from "@/utils/smpi";
import { format, parseISO } from "date-fns";

interface SMPIProgressCircleProps {
    selectedMonth: string;
    lastMonthStr: string;
    monthlyData: any;
    totalData: any;
}

export default function SMPIProgressCircle({ selectedMonth, lastMonthStr, monthlyData, totalData }: SMPIProgressCircleProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [radius, setRadius] = useState(80);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Dynamically set the radius of the SVG circle based on the container height
    useEffect(() => {
        function updateRadius() {
            if (containerRef.current) {
                const h = containerRef.current.offsetHeight;
                setRadius(Math.max(60, Math.min(100, Math.floor(h * 0.32))));
            }
        }
        updateRadius();
        window.addEventListener('resize', updateRadius);
        return () => window.removeEventListener('resize', updateRadius);
    }, []);

    const currentMonthData = monthlyData?.[selectedMonth] || {};
    const lastMonthData = monthlyData?.[lastMonthStr] || {};
    const months = Object.keys(monthlyData || {});

    // Prepare SMPI calculation inputs for current and last month
    const currentInputs = toSMPIInputs(currentMonthData, totalData);
    const lastInputs = toSMPIInputs(lastMonthData, totalData);

    // Calculate SMPI values
    const currentSMPI = calculateSMPI(currentInputs);
    const lastSMPI = calculateSMPI(lastInputs);

    // Calculate percent change between months
    let percentChange = 0;
    if (lastSMPI !== 0) {
        percentChange = ((currentSMPI - lastSMPI) / Math.abs(lastSMPI)) * 100;
    } else if (currentSMPI !== 0) {
        percentChange = 100;
    }
    const percentChangeStr = percentChange.toFixed(1) + "%";

    // Get color and label for current SMPI
    const color = getSMPIColor(currentSMPI);
    const label = getSMPILabel(currentSMPI);
    const percent = Math.max(0, Math.min(100, currentSMPI));
    const stroke = 20;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    // Tooltip position logic: prevent overflow from right and bottom of the window
    const handleMouseMove = (e: React.MouseEvent) => {
        const padding = 12;
        const tooltipWidth = tooltipRef.current?.offsetWidth || 320;
        const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
        let x = e.clientX + 16;
        let y = e.clientY + 8;

        if (x + tooltipWidth + padding > window.innerWidth) {
            x = window.innerWidth - tooltipWidth - padding;
        }
        if (y + tooltipHeight + padding > window.innerHeight) {
            y = window.innerHeight - tooltipHeight - padding;
        }
        setTooltipPos({ x, y });
    };

    // Show/hide tooltip on mouse enter/leave of the container
    useEffect(() => {
        const handleMouseEnter = () => {
            setShowTooltip(true);
        };
        const handleMouseLeave = () => {
            setShowTooltip(false);
        };
        containerRef.current?.addEventListener('mouseenter', handleMouseEnter);
        containerRef.current?.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            containerRef.current?.removeEventListener('mouseenter', handleMouseEnter);
            containerRef.current?.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    if (!currentMonthData) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md w-full">
                <div className="text-center p-8 text-gray-500">
                    <p className="mb-2">No SMPI data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md w-full h-full flex flex-col justify-center" ref={containerRef}>
            {/* Title and date, always left-aligned */}
            <div className="w-full">
                <h2 className="text-base font-medium text-gray-800 mb-2 text-left">Social Media Performance Index (SMPI)</h2>
                <div className="text-sm text-gray-600 mb-4 text-left">
                    {format(parseISO(selectedMonth + '-01'), 'MMM yyyy')}
                </div>
            </div>
            {/* Progress circle and details, centered */}
            <div className="flex flex-col items-center justify-center w-full h-full">
                <div>
                    <svg height={radius * 2} width={radius * 2} onMouseMove={handleMouseMove}>
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
                            fontSize="2.5rem"
                            fill={color}
                            fontWeight="bold"
                        >
                            {percent}
                        </text>
                    </svg>
                    {/* Tooltip with metrics table */}
                    {showTooltip && (
                        <div
                            ref={tooltipRef}
                            style={{
                                position: 'fixed',
                                left: tooltipPos.x,
                                top: tooltipPos.y,
                                zIndex: 50,
                                background: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: 8,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                padding: 16,
                                minWidth: 320,
                            }}
                        >
                            <table className="text-sm w-full">
                                <thead>
                                    <tr>
                                        <th className="text-left font-semibold px-4">Metric</th>
                                        <th className="text-center font-semibold px-4">Avg</th>
                                        <th className="text-center font-semibold px-4">{format(parseISO(lastMonthStr + '-01'), 'MMM yyyy')}</th>
                                        <th className="text-center font-semibold px-4">{format(parseISO(selectedMonth + '-01'), 'MMM yyyy')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-t">
                                        <td className="pr-4 py-1">Total Mentions (M)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_M.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.M ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.M ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td className="pr-4 py-1">Highly Positive (HP)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_HP.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.HP ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.HP ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="pr-4 py-1">Positive (P)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_P.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.P ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.P ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td className="pr-4 py-1">Neutral (N)</td>
                                        <td className="text-right py-1 px-4">{(totalData?.neutral / totalData?.countMonths || 0).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastMonthData?.sentiments?.neutral ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentMonthData?.sentiments?.neutral ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="pr-4 py-1">Negative (Neg)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_Neg.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.Neg ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.Neg ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td className="pr-4 py-1">Highly Negative (HN)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_HN.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.HN ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.HN ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="pr-4 py-1">Critical Feedback (Crit)</td>
                                        <td className="text-right py-1 px-4">{currentInputs.avg_Crit.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                                        <td className="text-right py-1 px-4">{(lastInputs.Crit ?? 0).toLocaleString()}</td>
                                        <td className="text-right py-1 px-4">{(currentInputs.Crit ?? 0).toLocaleString()}</td>
                                    </tr>
                                    <tr className="border-t-2">
                                        <td className="pr-4 py-1 font-bold">SMPI</td>
                                        <td className="text-right py-1 px-4 font-bold">{""}</td>
                                        <td className="text-right py-1 px-4 font-bold">{(lastSMPI.toFixed(1))}</td>
                                        <td className="text-right py-1 px-4 font-bold">{(currentSMPI.toFixed(1))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="mt-4 text-lg font-semibold text-center" style={{ color }}>
                    {label}
                </div>
                <div className={`mt-2 text-center text-sm}`} style= {{color}}>
                    {percentChange >= 0 ? '↑' : '↓'} {percentChangeStr} vs {format(parseISO(lastMonthStr + '-01'), 'MMM yyyy')}
                </div>
            </div>
        </div>
    );
}

// Prepare the input object for SMPI calculation from month and total data
function toSMPIInputs(monthData: any, totalData: any) {
    return {
        M: monthData?.total ?? 0,
        HP: monthData?.sentiments?.highly_positive ?? 0,
        P: monthData?.sentiments?.positive ?? 0,
        Neg: monthData?.sentiments?.negative ?? 0,
        HN: monthData?.sentiments?.highly_negative ?? 0,
        Crit: monthData?.criticism ?? 0,
        avg_M: (totalData?.totalPosts / totalData?.countMonths) || 0,
        avg_HP: (totalData?.highly_positive / totalData?.countMonths) || 0,
        avg_P: (totalData?.positive / totalData?.countMonths) || 0,
        avg_Neg: (totalData?.negative / totalData?.countMonths) || 0,
        avg_HN: (totalData?.highly_negative / totalData?.countMonths) || 0,
        avg_Crit: (totalData?.criticism / totalData?.countMonths) || 0,
    };
}