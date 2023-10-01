# friendlysite
import asyncio
import tornado
import os

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render('index.html')

def make_app():
    return tornado.web.Application(
        [(r"/", MainHandler)],
        debug=True,
        template_path="templates/",
        static_path=os.path.join(os.path.dirname(__file__), "static")
    )

async def main():
    app = make_app()
    app.listen(8889)
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
