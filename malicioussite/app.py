# malicioussite
import asyncio
import tornado
import os

def get_random_silly_links(num):
    # TODO: Have a large array of links, and serve them.
    #       At the moment, we just send the same URL over and over.
    links = ['http://localhost:8889' for _ in range(10)]
    return '[' + ",".join(map(lambda x: "'" + x + "'", links)) + ']'

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render(
            'index.html',
            width=10,
            height=10,
            num_mines=10,
            minelinks_array=get_random_silly_links(10)
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
