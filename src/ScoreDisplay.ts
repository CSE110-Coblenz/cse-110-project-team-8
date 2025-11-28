import Konva from "konva";

export class ScoreDisplay {
    private group: Konva.Group;
    private background: Konva.Rect;
    private scoreText: Konva.Text;
    private keyframeText: Konva.Text;
    private progressBar: Konva.Rect;
    private progressBarFill: Konva.Rect;
    private timerText: Konva.Text;
    private timerBar: Konva.Rect;
    private timerBarFill: Konva.Rect;
    private timesUpText: Konva.Text;

    private readonly PANEL_HEIGHT = 80;
    private currentScore: number = 0;
    private currentKeyframe: number = 0;
    private totalKeyframes: number = 0;
    private timeRemaining: number = 0;
    private totalTime: number = 0;

    constructor(width: number) {
        this.group = new Konva.Group({
            x: 0,
            y: 0,
        });

        // Semi-transparent background
        this.background = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: this.PANEL_HEIGHT,
            fill: '#222836',
            opacity: 0.95,
        });

        // Score text (left side) - starts at 0
        this.scoreText = new Konva.Text({
            x: 30,
            y: 25,
            text: 'SCORE: 0',
            fontSize: 32,
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'bold',
            fill: '#ffffff',
        });

        // Keyframe progress (right side)
        this.keyframeText = new Konva.Text({
            x: width * 0.85,
            y: 15,
            text: 'Keyframe: 0/0',
            fontSize: 18,
            fontFamily: 'Inter, sans-serif',
            fill: '#aaaaaa',
        });

        // Progress bar background
        this.progressBar = new Konva.Rect({
            x: width * 0.85,
            y: 45,
            width: width * 0.12,
            height: 20,
            fill: '#1b1f2a',
            cornerRadius: 10,
        });

        // Progress bar fill
        this.progressBarFill = new Konva.Rect({
            x: width * 0.85,
            y: 45,
            width: 0,
            height: 20,
            fill: '#b245fc',
            cornerRadius: 10,
        });


        // Timer display (center-left area)
        this.timerText = new Konva.Text({
            x: 300,
            y: 25,
            text: '⏱ 0.0s',
            fontSize: 28,
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'bold',
            fill: '#27c93f',
        });

        // Timer bar background (below timer text)
        this.timerBar = new Konva.Rect({
            x: 300,
            y: 58,
            width: 150,
            height: 15,
            fill: '#1b1f2a',
            cornerRadius: 8,
        });

        // Timer bar fill
        this.timerBarFill = new Konva.Rect({
            x: 300,
            y: 58,
            width: 150,
            height: 15,
            fill: '#27c93f',
            cornerRadius: 8,
        });

        // "TIME'S UP!" message (hidden by default)
        this.timesUpText = new Konva.Text({
            x: width / 2 - 100,
            y: 25,
            text: "TIME'S UP!",
            fontSize: 32,
            fontFamily: 'Inter, sans-serif',
            fontStyle: 'bold',
            fill: '#ff5f56',
            visible: false,
        });

        // Add all elements to group
        this.group.add(this.background);
        this.group.add(this.scoreText);
        this.group.add(this.keyframeText);
        this.group.add(this.progressBar);
        this.group.add(this.progressBarFill);
        this.group.add(this.timerBar);
        this.group.add(this.timerBarFill);
        this.group.add(this.timerText);
        this.group.add(this.timesUpText);
    }

    getGroup(): Konva.Group {
        return this.group;
    }

    getPanelHeight(): number {
        return this.PANEL_HEIGHT;
    }

    /**
     * Updates the score display with animation
     */
    updateScore(score: number, keyframeIndex: number, totalKeyframes: number): void {
        const oldScore = this.currentScore;
        this.currentScore = score;
        this.currentKeyframe = keyframeIndex;
        this.totalKeyframes = totalKeyframes;

        // Update score text
        this.scoreText.text(`SCORE: ${score}`);
        this.scoreText.fill('#ffffff'); // Default white color for score

        // Update keyframe progress
        this.keyframeText.text(`Keyframe: ${keyframeIndex}/${totalKeyframes}`);

        // Update progress bar
        const progress = totalKeyframes > 0 ? keyframeIndex / totalKeyframes : 0;
        const progressBarWidth = this.progressBar.width();
        this.progressBarFill.width(progressBarWidth * progress);

        // Animate score change
        if (score !== oldScore && keyframeIndex > 0) {
            this.animateScoreChange();
        }

        this.group.getLayer()?.draw();
    }

    /**
     * Updates the countdown timer display
     */
    updateTimer(timeRemainingMs: number, totalTimeMs: number): void {
        this.timeRemaining = timeRemainingMs;
        this.totalTime = totalTimeMs;

        const seconds = Math.max(0, Math.ceil(timeRemainingMs / 1000));
        this.timerText.text(`⏱ ${seconds}s`);

        // Calculate timer bar fill percentage
        const timeProgress = totalTimeMs > 0 ? timeRemainingMs / totalTimeMs : 0;
        const timerBarWidth = 150;
        this.timerBarFill.width(timerBarWidth * timeProgress);

        // Update color based on time remaining
        const timePercentage = timeProgress;
        let timerColor = '#27c93f'; // Green

        if (timePercentage <= 0.25) {
            timerColor = '#ff5f56'; // Red
        } else if (timePercentage <= 0.5) {
            timerColor = '#ffbd2e'; // Yellow
        }

        this.timerText.fill(timerColor);
        this.timerBarFill.fill(timerColor);

        // Pulse effect when time is low (<3 seconds)
        if (seconds < 3 && seconds > 0) {
            this.pulseTimer();
        }

        this.group.getLayer()?.draw();
    }

    /**
     * Shows the "TIME'S UP!" message briefly
     */
    showTimesUp(): void {
        this.timesUpText.visible(true);
        this.group.getLayer()?.draw();

        // Hide after 1 second
        setTimeout(() => {
            this.timesUpText.visible(false);
            this.group.getLayer()?.draw();
        }, 1000);
    }

    /**
     * Animates the score text with a brief pulse/scale effect
     */
    private animateScoreChange(): void {
        const originalScale = 1;
        const scaleUp = 1.15;

        // Scale up animation
        const scaleUpAnim = new Konva.Tween({
            node: this.scoreText,
            duration: 0.1,
            scaleX: scaleUp,
            scaleY: scaleUp,
            onFinish: () => {
                // Scale back down
                const scaleDownAnim = new Konva.Tween({
                    node: this.scoreText,
                    duration: 0.1,
                    scaleX: originalScale,
                    scaleY: originalScale,
                });
                scaleDownAnim.play();
            },
        });
        scaleUpAnim.play();
    }

    /**
     * Pulses the timer text when time is running low
     */
    private pulseTimer(): void {
        const originalScale = 1;
        const scaleUp = 1.1;

        const pulse = new Konva.Tween({
            node: this.timerText,
            duration: 1.0,
            scaleX: scaleUp,
            scaleY: scaleUp,
            onFinish: () => {
                const pulseBack = new Konva.Tween({
                    node: this.timerText,
                    duration: 1.0,
                    scaleX: originalScale,
                    scaleY: originalScale,
                });
                pulseBack.play();
            },
        });
        pulse.play();
    }

    /**
     * Resizes the score panel to fit new window width
     */
    resize(width: number): void {
        this.background.width(width);

        // Reposition right side elements
        this.keyframeText.x(width * 0.85);
        this.progressBar.x(width * 0.85);
        this.progressBar.width(width * 0.12);
        this.progressBarFill.x(width * 0.85);

        // Reposition "TIME'S UP!" message (center)
        this.timesUpText.x(width / 2);

        this.group.getLayer()?.draw();
    }
}
