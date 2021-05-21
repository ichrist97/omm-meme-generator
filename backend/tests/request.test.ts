import request from "supertest";
import { app } from "../src/app";
import monk from "monk";

// database
const databasePort = process.env.DATABASE_PORT || "27017";
const databaseName = process.env.DATABASE || "meme-generator";
const databaseUrl = `localhost:${databasePort}/${databaseName}`;
const db = monk(databaseUrl);

// Test Parameters
const memeId = "603b74448985c2093fdd3ad5";

const templateId = "603b717d8985c2093fdd3aac";

const gifId = "603b71658985c2093fdd3aa8";

const videoId = "603b71a58985c2093fdd3ab2";

const simpleCaptions = '[{"text": "hello"},{"text": "robin"}]';

const caption =
  '[{"text": "set 1","position": {"top": 0.5,"left": 0.4,"right": 0, "bottom": 0},"fontFace": {"fontSize": 40, "fontFamily": "Roboto","fontStyle": "normal","fontWeight": "bold", "color": "white","textStrokeColor": "black", "textStrokeWidth": "1"}} ]';

const captions =
  '[{"text": "set 1","position": {"top": 0.5,"left": 0.4,"right": 0,"bottom": 0},"fontFace": {"fontSize": 40, "fontFamily": "Roboto","fontStyle": "normal","fontWeight": "bold","color": "white","textStrokeColor": "black","textStrokeWidth": "1"},"start": 0, "end": 0.25 },{"text": "set 2","position": {"top": 0.5,"left": 0.4,"right": 0, "bottom": 0 }, "fontFace": { "fontSize": 40,"fontFamily": "Roboto","fontStyle": "normal","fontWeight": "bold","color": "white","textStrokeColor": "black","textStrokeWidth": "1" },"start": 0.1,"end": 0.5} ]';

const falseId = "12345";

const imagePath = "../development_assets/assets/templates/img/Batman-Slapping-Robin.jpg";

const gifPath = "../development_assets/assets/templates/gif/1.gif";

const globalUrl =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6A2uPoIft1gvtqS4DBeyqqAE7cR84ViUgCw&usqp=CAU";

const googleUrl = "https://www.google.de/";

const videoUrl = "http://techslides.com/demos/sample-videos/small.mp4";

const loginUser = async () => {
  const response = await request(app).post("/login").send({
    username: "admin",
    password: "admin",
  });
  return response;
};

// const loginTestUser = async () => {
//   const response = await request(app).post("/login").send({
//     username: "TestUser",
//     password: "test",
//   });
//   return response;
// };

describe("Authentication Tests", () => {
  test("Test Login with incorrect Data", async () => {
    const payload = {
      username: "testuser",
      password: "falsePassword",
    };
    const response = await request(app).post("/login").send(payload);
    expect(response.statusCode).toBe(403);
    expect(response.body.msg).toBe("Username or password incorrect");
  });

  test("Test Login with correct Data", async () => {
    const response = await loginUser();
    expect(response.statusCode).toBe(200);
  });

  test("Test Logout with correct Data", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const responseLogout = await request(app)
      .post("/login/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        token: accessToken,
      });
    expect(responseLogout.statusCode).toBe(200);
    expect(responseLogout.body.msg).toBe("Logout successful");
  });

  test("Test Refresh with correct Token", async () => {
    const responseLogin = await loginUser();
    const refreshToken = responseLogin.body.tokens.refreshToken;
    const responseRefresh = await request(app).post("/login/refresh").send({
      token: refreshToken,
    });
    expect(responseRefresh.statusCode).toBe(200);
  });

  test("Test Refresh with incorrect Token", async () => {
    const refreshToken = "incorrect Refresh Token";
    const responseRefresh = await request(app).post("/login/refresh").send({
      token: refreshToken,
    });
    expect(responseRefresh.statusCode).toBe(403);
    expect(responseRefresh.body.msg).toBe("Token invalid");
  });

  test("Test Refresh with no Token send", async () => {
    const refreshToken = "";
    const responseRefresh = await request(app).post("/login/refresh").send({
      token: refreshToken,
    });
    expect(responseRefresh.statusCode).toBe(422);
    expect(responseRefresh.body.msg).toBe("No token was sent");
  });

  test("Test Register existing User", async () => {
    const response = await request(app).post("/login/register").send({
      username: "bar",
      password: "123",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("User already exists");
  });

  test("Test Register non existing User", async () => {
    const payload = {
      username: "TestUser",
      password: "test",
    };
    const response = await request(app).post("/login/register").send(payload);
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Created user: TestUser");

    // cleanup delete user
    const users = db.get("users");
    await users.remove({ username: payload.username });
  });

  test("Test get User", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get("/login/user")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.username).toBe("admin");
  });
});

describe("Templates Tests", () => {
  test("Get Single Template by Id", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const responseTemplates = await request(app)
      .get(`/templates/template/${templateId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(responseTemplates.statusCode).toBe(200);
  });

  test("Get Templates from Database", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const responseTemplates = await request(app)
      .get("/templates")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(responseTemplates.statusCode).toBe(200);
  });

  test("Get Templates from Imgflip", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const responseTemplates = await request(app)
      .get("/templates/imgflip")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(responseTemplates.statusCode).toBe(200);
  });

  test("Upload Template", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "Test Cat Gif")
      .field("access", "public")
      .attach("template", gifPath);
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("File is uploaded");
  });

  test("Try to upload Template without Sending a File", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("name", "Test Cat Gif")
      .field("access", "public")
      .field("template", "It's just a Sting");
    expect(response.statusCode).toBe(400);
    expect(response.body.msg).toBe("No file uploaded or template information missing");
  });

  test("Upload Templates from Url leading to an Image", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/url")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        url: globalUrl,
        name: "Test Url Picture",
        access: "public",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("created new download");
  });

  test("Upload Templates from Url leading to a video", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/url")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        url: videoUrl,
        name: "Test Url Video",
        access: "public",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("created new download");
  });

  test("Try to upload Templates from Url not leading to an Image", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/url")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        url: googleUrl,
        name: "Test Url Picture",
        access: "public",
      });
    expect(response.statusCode).toBe(415);
    expect(response.body.msg).toBe("Media Type is not supported.");
  });

  test("Upload Templates from Screenshot", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/screenshot")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        url: googleUrl,
        name: "Test Screenshot Picture",
        access: "public",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("created new screenshot");
  }, 10000);

  test("View Template", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/view")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ templateId: templateId });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("View counter increased");
  });

  test("Like Template", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/like")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ templateId: templateId });
    expect(response.statusCode).toBe(200);
    if (response.body.msg === "Like for meme got created") {
      const response2 = await request(app)
        .post("/templates/like")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ templateId: templateId });
      expect(response2.statusCode).toBe(200);
      expect(response2.body.msg).toBe("Like already present");
    } else {
      expect(response.body.msg).toBe("Like already present");
    }
  });

  test("Unlike Template", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/templates/like")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        templateId: templateId,
        undo: true,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Like was removed");
    const responseLogin2 = await loginUser();
    const accessToken2 = responseLogin2.body.tokens.accessToken;
    const response2 = await request(app)
      .post("/templates/like")
      .set("Authorization", `Bearer ${accessToken2}`)
      .send({
        templateId: templateId,
        undo: true,
      });
    expect(response2.statusCode).toBe(200);
    expect(response2.body.msg).toBe("Like not found");
  });
});

describe("Meme Tests", () => {
  test("Get single Meme by id", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get(`/memes/meme/${memeId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Ok");
  });

  test("Create Static Image Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/meme")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("Connection", "keep-alive")
      .set("Accept", "*/*")
      .set("Accept-Encoding", "gzip, deflate, br")
      .field("template", templateId)
      .field("captions", caption)
      .field("access", "public")
      .field("name", "test Name");
    expect(response.statusCode).toBe(200);
  });

  test("Create Static Gif Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/meme")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("template", gifId)
      .field("captions", caption)
      .field("access", "public")
      .field("name", "test Name");
    expect(response.statusCode).toBe(200);
  }, 60000);

  test("Create Dynamic Video Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/meme")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("template", videoId)
      .field("captions", captions)
      .field("access", "public")
      .field("name", "test Name");
    expect(response.statusCode).toBe(200);
  }, 60000);

  test("Create and get Meme Collection", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/meme-collection")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("captions", simpleCaptions)
      .attach("template", imagePath);
    expect(response.statusCode).toBe(200);
  }, 20000);

  test("Get Filtered Zip Memes", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get(
        "/memes/filter-meme-collection/?likes=0&views=0&createdAfter=2020-02-01&createdBefore=2021-12-31"
      )
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
  }, 20000);

  test("Try to get single Meme by false id", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get(`/memes/meme/${falseId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(500);
  });

  test("Get Public Memes", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get("/memes/?limit=2&likes=0&views=0&createdAfter=2020-02-01&createdBefore=2021-01-20")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Ok");
  });

  test("Get User Memes", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .get(`/memes/user/${responseLogin.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Ok");
  });

  test("View Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/view")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ memeId: memeId });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("View counter increased");
  });

  test("Like Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/like")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ memeId: memeId });
    expect(response.statusCode).toBe(200);
    if (response.body.msg === "Like for meme got created") {
      const response2 = await request(app)
        .post("/memes/like")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ memeId: memeId });
      expect(response2.statusCode).toBe(200);
      expect(response2.body.msg).toBe("Like already present");
    } else {
      expect(response.body.msg).toBe("Like already present");
    }
  });

  test("Unlike Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/like")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        memeId: memeId,
        undo: true,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Like was removed");
    const responseLogin2 = await loginUser();
    const accessToken2 = responseLogin2.body.tokens.accessToken;
    const response2 = await request(app)
      .post("/memes/like")
      .set("Authorization", `Bearer ${accessToken2}`)
      .send({
        memeId: memeId,
        undo: true,
      });
    expect(response2.statusCode).toBe(200);
    expect(response2.body.msg).toBe("Like not found");
  });

  test("Comment Meme", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const response = await request(app)
      .post("/memes/comment")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        memeId: memeId,
        text: "This is a Test Comment",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.msg).toBe("Comment for meme got created");
  });
});

describe("Files Tests", () => {
  test("Upload and download File", async () => {
    const responseLogin = await loginUser();
    const accessToken = responseLogin.body.tokens.accessToken;
    const upload = await request(app)
      .post("/files/upload")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("template", gifPath);
    expect(upload.statusCode).toBe(200);
    const download = await request(app)
      .get(`/files/download/${upload.body}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(download.statusCode).toBe(200);
  });
});
