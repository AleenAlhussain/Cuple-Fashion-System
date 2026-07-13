import attribute from "../attribute.json";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const singleBlog = (await params).updateId;

  const attributeObj = attribute?.data.find((elem) => elem.id == singleBlog);

  return NextResponse.json(attributeObj);
}
