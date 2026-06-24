import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class User {
  @Prop({ index: true, lowercase: true, required: true, trim: true, type: String, unique: true })
  email!: string;

  @Prop({ required: true, trim: true, type: String })
  name!: string;

  @Prop({ required: true, select: false, type: String })
  passwordHash!: string;

  @Prop({ default: null, type: Date })
  emailVerifiedAt!: Date | null;

  @Prop({ default: null, select: false, type: String })
  emailVerificationTokenHash!: string | null;

  @Prop({ default: null, select: false, type: Date })
  emailVerificationTokenExpiresAt!: Date | null;

  @Prop({ default: null, select: false, type: String })
  passwordResetTokenHash!: string | null;

  @Prop({ default: null, select: false, type: Date })
  passwordResetTokenExpiresAt!: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
