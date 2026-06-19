import Gania from "./src/client.js";
type ToDo = { id: number; title: string };

const api = new Gania();

const { data } = await api.get<ToDo[]>("/todos/due", null, {
  strategy: "cache-first",
  dataType: "text",
});
data.pop()?.id;

const response = await api.get<string>("http://localhost:3000", null, {
  dataType: "text",
});
console.log(response);
