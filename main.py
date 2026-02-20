import os
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, PyMongoError


DEFAULT_URI = "mongodb://localhost:27017/"
DEFAULT_DB_NAME = "hello_db"
DEFAULT_COLLECTION_NAME = "hello_collection"


def make_client(uri):
    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
    client.admin.command("ping")
    return client


def run():
    mongo_uri = os.getenv("MONGO_URI", DEFAULT_URI)
    db_name = os.getenv("MONGO_DB", DEFAULT_DB_NAME)
    collection_name = os.getenv("MONGO_COLLECTION", DEFAULT_COLLECTION_NAME)

    try:
        client = make_client(mongo_uri)
    except ServerSelectionTimeoutError:
        print("MongoDB недоступна.")
        return 2
    except Exception as e:
        print(f"Не удалось подключиться к MongoDB: {e}")
        return 2

    try:
        db = client[db_name]
        coll = db[collection_name]

        doc = {
            "note": "Запуск приложения",
            "created_at": datetime.now(timezone.utc),
        }

        inserted_id = coll.insert_one(doc).inserted_id
        saved = coll.find_one({"_id": inserted_id})

        print("Вставка и чтение выполнены успешно.")
        print(f"_id: {inserted_id}")
        print(f"doc: {saved}")

        return 0

    except PyMongoError as e:
        print(f"Ошибка при работе с MongoDB: {e}")
        return 3
    finally:
        client.close()


if __name__ == "__main__":
    run()
