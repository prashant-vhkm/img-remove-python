from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from rembg import remove

app = FastAPI()

# ✅ CORS (MANDATORY for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process/transparent")
async def process_transparent(image: UploadFile = File(...)):
    """
    Receives:
      - multipart/form-data
      - field name MUST be 'image'
    Returns:
      - PNG bytes with transparent background
    """

    if not image:
        raise HTTPException(status_code=400, detail="Image file missing")

    try:
        input_bytes = await image.read()
        output_bytes = remove(input_bytes)

        return Response(
            content=output_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": "inline; filename=transparent.png"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
