import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: "auth_sessions", timestamps: true })
export class AuthSession {
  @Prop({ required: true, type: String })
  userId!: string;

  @Prop({ required: true, type: String })
  tokenId!: string;

  @Prop({ index: { expireAfterSeconds: 0 }, required: true, type: Date })
  expiresAt!: Date;

  @Prop({ default: null, type: Date })
  revokedAt!: Date | null;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

AuthSessionSchema.index({ tokenId: 1 }, { unique: true });
AuthSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
