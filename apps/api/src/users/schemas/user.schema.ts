import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ timestamps: true })
export class User {
  @Prop({ index: true, lowercase: true, required: true, trim: true, type: String, unique: true })
  email!: string;

  @Prop({ required: true, trim: true, type: String })
  name!: string;

  @Prop({ required: true, select: false, type: String })
  passwordHash!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
