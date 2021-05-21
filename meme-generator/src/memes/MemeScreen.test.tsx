import React from "react";
import {MemeScreen} from "./MemeScreen";
import ReactDOM from "react-dom";
import {BrowserRouter, Route} from "react-router-dom";

test("renders without crashing", () => {
    const div = document.createElement("div");
    ReactDOM.render(
        <BrowserRouter>
            <Route path={["/", "/meme"]} component={MemeScreen} />
        </BrowserRouter>,
        div
    );
    ReactDOM.unmountComponentAtNode(div);
});
