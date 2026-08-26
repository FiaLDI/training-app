"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const path_1 = require("path");
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const typeorm_1 = require("typeorm");
const body_measurement_entity_1 = require("./src/modules/body-measurement/core/entity/body-measurement.entity");
const user_entity_1 = require("./src/modules/auth/core/entity/user.entity");
const feedback_entity_1 = require("./src/modules/feedback/core/entity/feedback.entity");
const exercise_entity_1 = require("./src/modules/exercise/core/entity/exercise.entity");
const exercise_source_entity_1 = require("./src/modules/source/core/entity/exercise-source.entity");
const exercise_timecode_entity_1 = require("./src/modules/source/core/entity/exercise-timecode.entity");
const program_day_entity_1 = require("./src/modules/program/core/entity/program-day.entity");
const program_entity_1 = require("./src/modules/program/core/entity/program.entity");
const template_exercise_entity_1 = require("./src/modules/template/core/entity/template-exercise.entity");
const workout_template_entity_1 = require("./src/modules/template/core/entity/workout-template.entity");
const training_exercise_entity_1 = require("./src/modules/training/core/entity/training-exercise.entity");
const training_set_entity_1 = require("./src/modules/training/core/entity/training-set.entity");
const training_entity_1 = require("./src/modules/training/core/entity/training.entity");
const envCandidates = [
    (0, path_1.resolve)(process.cwd(), '.env'),
    (0, path_1.resolve)(process.cwd(), '../.env'),
    (0, path_1.resolve)(__dirname, '../.env'),
];
for (const path of envCandidates) {
    if ((0, fs_1.existsSync)(path)) {
        (0, dotenv_1.config)({ path });
        break;
    }
}
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: true,
    entities: [
        user_entity_1.UserEntity,
        body_measurement_entity_1.BodyMeasurementEntity,
        feedback_entity_1.FeedbackEntity,
        exercise_entity_1.ExerciseEntity,
        exercise_source_entity_1.ExerciseSourceEntity,
        exercise_timecode_entity_1.ExerciseTimecodeEntity,
        workout_template_entity_1.WorkoutTemplateEntity,
        template_exercise_entity_1.TemplateExerciseEntity,
        program_entity_1.ProgramEntity,
        program_day_entity_1.ProgramDayEntity,
        training_entity_1.TrainingEntity,
        training_exercise_entity_1.TrainingExerciseEntity,
        training_set_entity_1.TrainingSetEntity,
    ],
    migrations: ['src/migrations/*.ts'],
});
//# sourceMappingURL=data-source.js.map