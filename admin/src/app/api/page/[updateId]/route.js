import page from "../page.json";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const singleOrder = (await params).updateId;

  const pageObj = page?.data.find((elem) => elem.id == singleOrder);

  return NextResponse.json(pageObj);
}
