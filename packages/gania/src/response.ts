import {  ResponseDataType } from "./types";



export async function getResponseData<T = any>(
  response: Response,
  dataType: ResponseDataType = "json",
): Promise<{ data: T; dataType: ResponseDataType }> {
  // Handle explicit types safely without unsafe dynamic property lookups
  if (dataType !== "flexible") {
    let data: any;
    if (dataType === "json") data = await response.json();
    else if (dataType === "text") data = await response.text();
    else if (dataType === "blob") data = await response.blob();
    else if (dataType === "bytes") {
      const buffer = await response.arrayBuffer();
      data = new Uint8Array(buffer);
    }
    return { data, dataType };
  }

  // Handle the 'flexible' inferred fallback chain correctly
  try {
    const data = await response.json();
    return { data, dataType: "json" };
  } catch {
    try {
      const data = await response.text() as T;
      return { data, dataType: "text" };
    } catch {
      try {
        const data = await response.blob() as T;
        return { data, dataType: "blob" };
      } catch {
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer) as T;
        return { data, dataType: "bytes" };
      }
    }
  }
}
