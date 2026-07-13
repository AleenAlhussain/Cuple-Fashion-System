import { emailSchema, passwordSchema, YupObject } from "../../validation/ValidationSchemas";

export const LogInSchema = YupObject({
  email: emailSchema,
  password: passwordSchema,
});
