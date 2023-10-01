# malicioussite
import asyncio
import tornado
import os

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        game = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, -1, 0, 0, 0, 0, -1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, -1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ]
        self.render(
            'index.html',
            IFRAMESRC="http://localhost:8889",
            game=game,
        )

def make_app():
    return tornado.web.Application(
        [(r"/", MainHandler)],
        debug=True,
        template_path="templates/",
        static_path=os.path.join(os.path.dirname(__file__), "static")
        )

async def main():
    app = make_app()
    app.listen(8888)
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
