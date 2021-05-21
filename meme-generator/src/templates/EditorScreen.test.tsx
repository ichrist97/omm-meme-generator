import React from "react";
import {EditorScreen} from "./EditorScreen";
import ReactDOM from "react-dom";
import {BrowserRouter, Route} from "react-router-dom";

test("renders without crashing", () => {
    const div = document.createElement("div");
    ReactDOM.render(
        <BrowserRouter>
            <Route path={["/template/:urlTabStatus/:templateId", "/template"]} component={EditorScreen} />
        </BrowserRouter>,
        div
    );
    ReactDOM.unmountComponentAtNode(div);
});
