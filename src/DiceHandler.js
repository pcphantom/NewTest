/* =====================================================================
   DiceHandler
   Owns: dice generation from an injected random number source.
   Stays out of: game rules and UI.
   ===================================================================== */

export class DiceHandler {
    constructor(random_number_generator) {
        if (typeof random_number_generator !== "function") {
            throw new TypeError("DiceHandler requires a random number generator function.");
        }

        this.random_number_generator = random_number_generator;
    }

    roll_die(side_count) {
        if (!Number.isInteger(side_count) || side_count < 2) {
            throw new RangeError(`Invalid die side count: ${side_count}`);
        }

        const random_value = this.random_number_generator();
        if (random_value < 0 || random_value >= 1) {
            throw new RangeError(`Random number generator returned ${random_value}; expected 0 <= value < 1.`);
        }

        return Math.floor(random_value * side_count) + 1;
    }

    roll_d6() {
        return this.roll_die(6);
    }

    roll_d20() {
        return this.roll_die(20);
    }
}
