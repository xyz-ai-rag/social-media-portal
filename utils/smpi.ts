interface SMPIInputs {
    // Current month data
    M: number;      // Total mentions this month
    HP: number;     // Highly positive mentions
    P: number;      // Positive mentions
    Neg: number;    // Negative mentions
    HN: number;     // Highly negative mentions
    Crit: number;   // Critical feedback mentions

    // Historical averages
    avg_M: number;  // Average monthly mentions
    avg_HP: number; // Average highly positive mentions
    avg_P: number;  // Average positive mentions
    avg_Neg: number;// Average negative mentions
    avg_HN: number; // Average highly negative mentions
    avg_Crit: number;// Average critical feedback mentions
}

/**
 * Clamps a value between a minimum and maximum
 */
const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

/**
 * Calculates the Social Media Performance Index (SMPI)
 * @param inputs The input data for SMPI calculation
 * @returns The calculated SMPI value (1-100)
 */
export const calculateSMPI = (inputs: SMPIInputs): number => {
    const {
        M, HP, P, Neg, HN, Crit,
        avg_M, avg_HP, avg_P, avg_Neg, avg_HN, avg_Crit
    } = inputs;

    // Step 1: Calculate Base Score
    const baseScore = 50 * (1 + (2 * HP + P - Neg - 2 * HN - 2 * Crit) / (2 * Math.max(1, M)));

    // Step 2: Calculate Deviation Adjustment
    const D = 2 * (HP - avg_HP) + (P - avg_P) - (Neg - avg_Neg) - 2 * (HN - avg_HN) - 2 * (Crit - avg_Crit);
    const deviationAdjustment = 10 * clamp(D / (2 * Math.max(1, avg_M)), -2, 2);

    // Step 3: Calculate final SMPI
    const smpi = Math.max(1, Math.min(100, Math.round(baseScore + deviationAdjustment)));

    return smpi;
};

/**
 * Gets the performance label based on SMPI value
 */
export const getSMPILabel = (smpi: number): string => {
    if (smpi >= 70) return "Strong Performance";
    if (smpi >= 50) return "Acceptable";
    return "Needs Attention";
};

/**
 * Gets the color based on SMPI value
 */
export const getSMPIColor = (smpi: number): string => {
    if (smpi >= 70) return "#81C784"; // even deeper green
    if (smpi >= 50) return "#2196F3"; // blue  
    return "#E57373"; // even deeper red
}; 