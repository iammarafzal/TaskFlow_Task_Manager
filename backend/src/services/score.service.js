/**
 * Priority Score Engine Service
 * Provides business logic to dynamically calculate priority scores for tasks
 * based on their impact categorization and proximity to their deadline.
 */

/**
 * Evaluates and returns the priority score of a given task.
 * Completed tasks are always assigned a priority score of 0.
 * 
 * @param {object} task - The task object containing impact, deadline, and status.
 * @returns {number} The computed dynamic priority score.
 */
export function calculatePriorityScore(task) {
    // Rule: Completed tasks carry zero priority
    if (task.status === 'COMPLETED') {
        return 0;
    }

    // 1. Establish base score from task impact
    let baseScore = 5; // Default for LOW impact
    if (task.impact === 'HIGH') {
        baseScore = 20;
    } else if (task.impact === 'MEDIUM') {
        baseScore = 10;
    }

    // 2. Assess urgency based on deadline proximity
    const now = new Date();
    const deadline = new Date(task.deadline);
    const msDiff = deadline.getTime() - now.getTime();
    const hoursRemaining = msDiff / (1000 * 60 * 60);

    let urgencyModifier = 0;

    if (hoursRemaining <= 0) {
        // Task is overdue; maximum urgency is injected
        urgencyModifier = 40;
    } else if (hoursRemaining <= 1) {
        // Due in under 1 hour
        urgencyModifier = 30;
    } else if (hoursRemaining <= 3) {
        // Due in 1 to 3 hours
        urgencyModifier = 20;
    } else if (hoursRemaining <= 12) {
        // Due in 3 to 12 hours
        urgencyModifier = 15;
    } else if (hoursRemaining <= 24) {
        // Due in 12 to 24 hours
        urgencyModifier = 10;
    } else if (hoursRemaining <= 72) {
        // Due in 24 to 72 hours
        urgencyModifier = 5;
    }

    // The dynamic priority score is the sum of task impact value and deadline urgency
    return baseScore + urgencyModifier;
}