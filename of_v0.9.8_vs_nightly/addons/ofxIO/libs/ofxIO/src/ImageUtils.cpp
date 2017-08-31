//
// Copyright (c) 2017 Christopher Baker <https://christopherbaker.net>
//
// SPDX-License-Identifier:	MIT
//


#include "ofx/IO/ImageUtils.h"
#include "FreeImage.h"


namespace ofx {
namespace IO {



bool ImageUtils::loadHeader(ImageHeader& header,
                            const std::filesystem::path& path,
                            bool loadPixelsIfRequired)
{
    int flags = FIF_LOAD_NOPIXELS;

    auto fif = FreeImage_GetFIFFromFilename(path.string().c_str());

    if (FreeImage_FIFSupportsNoPixels(fif))
    {
        FIBITMAP* dib = FreeImage_Load(fif, path.string().c_str(), flags);

        if (dib)
        {
            header.width = FreeImage_GetWidth(dib);
            header.height = FreeImage_GetHeight(dib);
            header.bpp = FreeImage_GetBPP(dib);

            FreeImage_Unload(dib);
            return true;
        }
    }


    if (loadPixelsIfRequired)
    {
        ofLogWarning("ImageUtils::loadHeader") << "Loading full pixels, may be slow: " << path;
        ofPixels pixels;
        if (ofLoadImage(pixels, path))
        {
            header.width = pixels.getWidth();
            header.height = pixels.getHeight();
            header.bpp = pixels.getBitsPerPixel();
            return true;
        }
    }

    return false;
}


ofPixels_<unsigned char> ImageUtils::scaleAndCropTo(const ofPixels_<unsigned char>& pixels,
                                                    std::size_t width,
                                                    std::size_t height,
                                                    ofScaleMode scaleMode)
{
    ofRectangle inRect(0, 0, pixels.getWidth(), pixels.getHeight());

    ofRectangle outRect(0, 0, width, height);

    inRect.scaleTo(outRect, scaleMode);

    auto inPixels = pixels;

    inPixels.resize(inRect.getWidth(), inRect.getHeight());

    ofPixels_<unsigned char> outPixels;

    inPixels.cropTo(outPixels,
                    outRect.x - inRect.x,
                    0,
                    outRect.width,
                    outRect.height);

    return outPixels;
}


ofPixels_<unsigned char> ImageUtils::dither(const ofPixels_<unsigned char>& pixels,
                                            float threshold,
                                            float quantWeight)
{
    // Special thanks to @julapy / ofxDither
    auto pixelsIn = pixels;

    // ensure the image is grayscale
    if (OF_IMAGE_GRAYSCALE != pixelsIn.getImageType())
    {
        pixelsIn = toGrayscale(pixels);
    }

    // make a copy
    auto pixelsOut = pixelsIn;

    // set up the quantization error
    std::size_t width  = pixelsOut.getWidth();
    std::size_t height = pixelsOut.getHeight();

    std::size_t numPixels = width * height; // 1 byte / pixel

    std::vector<float> qErrors(numPixels);

    //unsigned char* inPix  = pixelsIn.getPixels();
    unsigned char* outPix = pixelsOut.getData();

    float limit = ofColor_<unsigned char>::limit();

    for (std::size_t y = 0; y < height; y++)
    {
        for (std::size_t x = 0; x < width; x++)
        {
            std::size_t p = pixelsIn.getPixelIndex(x, y);

            // Add error.
            std::size_t oldPx = outPix[p] + qErrors[p];

            // Threshold.
            std::size_t newPx = (oldPx < (threshold * limit)) ? 0 : limit;

            outPix[p] = newPx;

            std::size_t qError = oldPx - newPx;

            _accumulateDitherError(x + 1, y    , pixelsOut, qError, qErrors, quantWeight); // check east
            _accumulateDitherError(x + 2, y    , pixelsOut, qError, qErrors, quantWeight); // check east east
            _accumulateDitherError(x - 1, y + 1, pixelsOut, qError, qErrors, quantWeight); // check southwest
            _accumulateDitherError(x    , y + 1, pixelsOut, qError, qErrors, quantWeight); // check south
            _accumulateDitherError(x + 1, y + 1, pixelsOut, qError, qErrors, quantWeight); // check southeast
            _accumulateDitherError(x    , y + 2, pixelsOut, qError, qErrors, quantWeight); // check south south
        }
    }
    
    return pixelsOut;
}


ofPixels_<unsigned char> ImageUtils::toGrayscale(const ofPixels_<unsigned char>& pixels)
{
    if (OF_IMAGE_GRAYSCALE == pixels.getImageType())
    {
        return pixels;
    }

    ofImage img;
    img.setUseTexture(false);
    img.setFromPixels(pixels);
    img.setImageType(OF_IMAGE_GRAYSCALE);
    return img.getPixels();
}


void ImageUtils::_accumulateDitherError(std::size_t x,
                                        std::size_t y,
                                        ofPixels_<unsigned char>& pixels,
                                        int qError,
                                        std::vector<float>& qErrors,
                                        float quantWeight)
{
    if (x < pixels.getWidth() && y < pixels.getHeight())
    {
        qErrors[pixels.getPixelIndex(x, y)] += quantWeight * qError;
    }
}



} } // namespace ofx::IO
