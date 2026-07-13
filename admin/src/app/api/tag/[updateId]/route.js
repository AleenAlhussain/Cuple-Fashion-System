import tag from "../tag.json";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const singleTag = (await params).updateId;

  const tagObj = tag?.data.find((elem) => elem.id == singleTag);

  return NextResponse.json(tagObj);
}
